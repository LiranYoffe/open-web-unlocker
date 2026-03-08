/**
 * walmart.ts — Walmart product and listing page parser.
 *
 * Strategy:
 *   1. Extract Walmart's embedded Next.js data from __NEXT_DATA__ script tag first.
 *      Path: props.pageProps.initialData.data.{product, idml, reviews}
 *      and props.pageProps.initialData.searchResult for /search and /browse pages
 *      - product: name, brand.name, usItemId, priceInfo
 *      - product.reviewStatistics: averageOverallRating, totalReviewCount
 *      - idml.productHighlights[]: {name, value} feature pairs
 *      - idml.specifications[]: {name, value} spec pairs
 *      - idml.longDescription / shortDescription: HTML strings
 *   2. parseGenericProduct() handles JSON-LD Product + universal itemprop/og: fallbacks.
 *   3. DOM selectors for browser-rendered pages where __NEXT_DATA__ product may be absent.
 *
 * Note: Walmart blocks datacenter IPs, returning 404 pages with product=null in __NEXT_DATA__.
 * On genuine 404 pages the parser throws, which causes the orchestrator to fall back to generic.
 * On a successful product page (200 OK via residential proxy), all fields should be available.
 *
 * Selector priority: __NEXT_DATA__ → JSON-LD → [itemprop] → [data-testid] → semantic HTML
 * Never use: [class*=...] substring class selectors
 */

import { selectAll, selectOne } from "css-select";
import type { Element } from "domhandler";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import {
	extractJsonLd,
	findByType,
	getMeta,
	parseGenericProduct,
	renderMarkdown,
	stringVal,
} from "./generic-product";
import type { ProductData, ProductSearchData, ProductSearchResult } from "./page-data";

interface NextDataProduct {
	name?: unknown;
	brand?: unknown;
	usItemId?: unknown;
	productId?: unknown;
	priceInfo?: unknown;
	reviewStatistics?: unknown;
}

interface NextDataIdml {
	productHighlights?: unknown;
	specifications?: unknown;
	longDescription?: unknown;
	shortDescription?: unknown;
}

interface WalmartNextData {
	product: NextDataProduct | null | undefined;
	idml: NextDataIdml | null | undefined;
	reviews?: unknown;
	searchResult?: Record<string, unknown> | null | undefined;
}

/** Extract Walmart's embedded Next.js data from __NEXT_DATA__ script tag. */
function parseNextData(html: string): WalmartNextData | null {
	const doc = parseDocument(html);
	const nextDataEl = selectOne('script[id="__NEXT_DATA__"]', doc) as Element | null;
	if (!nextDataEl) return null;

	try {
		const json = JSON.parse(textContent(nextDataEl)) as Record<string, unknown>;
		const props = (json.props as Record<string, unknown> | undefined) ?? {};
		const pageProps = (props.pageProps as Record<string, unknown> | undefined) ?? {};
		const initialData = (pageProps.initialData as Record<string, unknown> | undefined) ?? {};
		const data = (initialData.data as Record<string, unknown> | undefined) ?? {};

			return {
				product: (data.product as NextDataProduct | null | undefined) ?? null,
				idml: (data.idml as NextDataIdml | null | undefined) ?? null,
				reviews: data.reviews,
				searchResult:
					(initialData.searchResult as Record<string, unknown> | null | undefined) ?? null,
			};
		} catch {
			return null;
		}
}

function stripHtml(raw: string | null): string | null {
	if (!raw) return null;
	const stripped = raw
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return stripped || null;
}

function parsePriceText(raw: unknown): { value: string | null; currency: string | null } {
	if (typeof raw !== "string" || !raw.trim()) return { value: null, currency: null };
	const cleaned = raw.replace(/^Now\s+/i, "").trim();
	const match = cleaned.match(/^([$€£¥₹])?\s*([\d,.]+)/);
	if (!match) return { value: cleaned, currency: null };
	const symbolMap: Record<string, string> = {
		$: "USD",
		"€": "EUR",
		"£": "GBP",
		"¥": "JPY",
		"₹": "INR",
	};
	return {
		value: match[2] ?? null,
		currency: match[1] ? symbolMap[match[1]] ?? match[1] : null,
	};
}

function toAbsoluteUrl(rawUrl: string | null, pageUrl: string): string | null {
	if (!rawUrl) return null;
	try {
		return new URL(rawUrl, pageUrl).toString();
	} catch {
		return rawUrl;
	}
}

function extractSearchQuery(
	searchResult: Record<string, unknown>,
	url: string,
): string | null {
	try {
		const parsedUrl = new URL(url);
		const q = parsedUrl.searchParams.get("q");
		if (q) return q.trim();
	} catch {
		// ignore
	}

	const catInfo = searchResult.catInfo as Record<string, unknown> | undefined;
	const categoryName = stringVal(catInfo?.name);
	if (categoryName) return categoryName;

	const title = stringVal(searchResult.title);
	if (!title) return null;
	const match = title.match(/^Results for "(.+)"$/);
	return match?.[1] ?? title;
}

function extractSearchBadge(item: Record<string, unknown>): string | null {
	const badges = item.badges as Record<string, unknown> | undefined;
	const flags = badges?.flags;
	if (Array.isArray(flags)) {
		for (const flag of flags) {
			const text = stringVal((flag as Record<string, unknown>).text);
			if (text) return text;
		}
	}
	const groupsV2 = badges?.groupsV2;
	if (Array.isArray(groupsV2)) {
		for (const group of groupsV2) {
			const members = (group as Record<string, unknown>).members;
			if (!Array.isArray(members)) continue;
			for (const member of members) {
				const content = (member as Record<string, unknown>).content;
				if (!Array.isArray(content)) continue;
				for (const block of content) {
					const value = stringVal((block as Record<string, unknown>).value);
					if (value) return value;
				}
			}
		}
	}
	return null;
}

function parseSearchResultItem(
	item: Record<string, unknown>,
	pageUrl: string,
): ProductSearchResult | null {
	const name = stringVal(item.name);
	if (!name) return null;

	const priceInfo = item.priceInfo as Record<string, unknown> | undefined;
	const priceDisplay =
		stringVal(priceInfo?.linePrice)
		?? stringVal(priceInfo?.currentPrice)
		?? stringVal(priceInfo?.itemPrice)
		?? stringVal(priceInfo?.priceRangeString);
	const listPriceDisplay = stringVal(priceInfo?.wasPrice);
	const parsedPrice = parsePriceText(priceDisplay);
	const parsedListPrice = parsePriceText(listPriceDisplay);

	const imageInfo = item.imageInfo as Record<string, unknown> | undefined;
	const allImages = imageInfo?.allImages;
	let imageUrl =
		stringVal(imageInfo?.thumbnailUrl)
		?? stringVal(imageInfo?.url)
		?? null;
	if (!imageUrl && Array.isArray(allImages)) {
		for (const image of allImages) {
			const candidate = stringVal((image as Record<string, unknown>).url);
			if (candidate) {
				imageUrl = candidate;
				break;
			}
		}
	}

	const availability = item.availabilityStatusV2 as Record<string, unknown> | undefined;
	const sponsored =
		item.isSponsored === true ||
		item.sponsored === true ||
		item.advertisement === true;

	return {
		name,
		url: toAbsoluteUrl(stringVal(item.canonicalUrl), pageUrl),
		price: parsedPrice.value,
		currency: parsedPrice.currency ?? (parsedPrice.value ? "USD" : null),
		listPrice: parsedListPrice.value,
		rating:
			item.averageRating !== undefined && item.averageRating !== null
				? String(item.averageRating)
				: null,
		reviewCount:
			item.numberOfReviews !== undefined && item.numberOfReviews !== null
				? String(item.numberOfReviews)
				: null,
		imageUrl,
		sponsored,
		badge: extractSearchBadge(item),
	};
}

function parseWalmartSearchResults(
	html: string,
	url: string,
	searchResult: Record<string, unknown>,
): ProductSearchData | null {
	const itemStacks = searchResult.itemStacks;
	if (!Array.isArray(itemStacks)) return null;

	const results: ProductSearchResult[] = [];
	for (const stack of itemStacks) {
		const items = (stack as Record<string, unknown>).items;
		if (!Array.isArray(items)) continue;
		for (const rawItem of items) {
			if (!rawItem || typeof rawItem !== "object") continue;
			const parsed = parseSearchResultItem(rawItem as Record<string, unknown>, url);
			if (parsed) results.push(parsed);
		}
	}

	if (results.length === 0) return null;

	const doc = parseDocument(html);
	const titleEl = selectOne("title", doc) as Element | null;
	const pageTitle = titleEl ? textContent(titleEl).trim() || null : null;
	const totalResultsRaw = searchResult.aggregatedCount ?? searchResult.count ?? searchResult.gridItemsCount;
	const totalResults =
		totalResultsRaw !== undefined && totalResultsRaw !== null ? String(totalResultsRaw) : null;

	return {
		type: "product-search",
		title: pageTitle ?? extractSearchQuery(searchResult, url) ?? "Walmart results",
		url,
		platform: "walmart",
		query: extractSearchQuery(searchResult, url),
		...(totalResults ? { totalResults } : {}),
		results,
	};
}

export function parseWalmart(html: string, url: string): ProductData | ProductSearchData {
	// ── Extract __NEXT_DATA__ first (before parseGenericProduct) ─────────────
	// This lets us use product node name/price to satisfy parseGenericProduct's guard.
	const nextData = parseNextData(html);
	const searchResults = nextData?.searchResult ?? null;
	const searchData = searchResults ? parseWalmartSearchResults(html, url, searchResults) : null;
	if (searchData) return searchData;
	const productNode = nextData?.product ?? null;
	// IMPORTANT: idml data is ONLY trusted when the product node is non-null.
	// On Walmart 404 pages, idml contains data from a random unrelated product.
	const idml = productNode ? (nextData?.idml ?? null) : null;

	// ── Base parse: JSON-LD + itemprop + og: fallbacks ────────────────────────
	// parseGenericProduct throws if it finds neither name nor price.
	// We pre-check __NEXT_DATA__ to avoid a false throw when product data is in Next.js.
	let result: ProductData;
	try {
		result = parseGenericProduct(html, url, "walmart");
	} catch {
		// parseGenericProduct found no name/price via JSON-LD, itemprop, or og:.
		// Try to get minimal data from __NEXT_DATA__ product node before giving up.
		// Only use product node data — do NOT fall back to idml when product is null.
		const name = productNode ? stringVal(productNode.name as unknown) : null;
			const priceInfo = productNode?.priceInfo as Record<string, unknown> | undefined;
			const currentPrice = priceInfo?.currentPrice as Record<string, unknown> | undefined;
			const rawPrice = currentPrice?.price ?? priceInfo?.price;
			const price = rawPrice !== undefined && rawPrice !== null ? String(rawPrice) : null;
			// Only use idml description when product is non-null (trusted idml)
			const idmlDesc = idml
				? stripHtml(stringVal(idml.longDescription) ?? stringVal(idml.shortDescription))
				: null;

		if (!name && !price && !idmlDesc) {
			throw new Error("No Walmart product content found");
		}

		const doc = parseDocument(html);
		// Build minimal result without parseGenericProduct
		result = {
			type: "product",
			title: name ?? null,
			url,
			platform: "walmart",
			name,
			brand: null,
			sku: null,
			price,
			currency: null,
			availability: null,
			condition: null,
			rating: null,
			reviewCount: null,
			features: [],
			specifications: [],
			description: idmlDesc ?? getMeta(doc, "og:description"),
		};
	}

	// Parse the document again for DOM augmentation
	const doc = parseDocument(html);

	// ── Name fallbacks ─────────────────────────────────────────────────────
	if (!result.name && productNode) {
		result.name = stringVal(productNode.name as unknown);
		if (result.name && !result.title) result.title = result.name;
	}
	if (!result.name) {
		// DOM: h1[itemprop="name"] or data-automation="product-title"
		const nameEl =
			(selectOne('h1[itemprop="name"]', doc) as Element | null) ??
			(selectOne('[data-automation="product-title"]', doc) as Element | null) ??
			(selectOne('h1[data-testid="product-title"]', doc) as Element | null);
		if (nameEl) {
			result.name = textContent(nameEl).trim() || null;
			if (!result.title) result.title = result.name;
		}
	}

	// ── Price fallbacks ────────────────────────────────────────────────────
	if (!result.price && productNode) {
		const priceInfo = productNode.priceInfo as Record<string, unknown> | undefined;
		if (priceInfo) {
			const currentPrice = priceInfo.currentPrice as Record<string, unknown> | undefined;
			const rawPrice = currentPrice?.price ?? priceInfo.price;
			if (rawPrice !== undefined && rawPrice !== null) {
				result.price = String(rawPrice);
			}
		}
	}
	if (!result.price) {
		// DOM: [itemprop="price"] or data-automation="product-price"
		const priceEl =
			(selectOne('[itemprop="price"]', doc) as Element | null) ??
			(selectOne('[data-automation="product-price"]', doc) as Element | null);
		if (priceEl) {
			result.price =
				textContent(priceEl)
					.replace(/[^0-9.]/g, "")
					.trim() || null;
		}
	}

	// ── Brand ───────────────────────────────────────────────────────────────
	if (!result.brand && productNode) {
		const brandNode = productNode.brand as Record<string, unknown> | undefined;
		result.brand = brandNode ? stringVal(brandNode.name) : null;
	}
	if (!result.brand) {
		// idml.productHighlights may have a "Brand" entry
		const highlights = idml?.productHighlights;
		if (Array.isArray(highlights)) {
			for (const h of highlights as Record<string, unknown>[]) {
				if (
					typeof h.name === "string" &&
					h.name.toLowerCase() === "brand" &&
					typeof h.value === "string"
				) {
					result.brand = h.value || null;
					break;
				}
			}
		}
	}

	// ── SKU: usItemId or productId ─────────────────────────────────────────
	if (!result.sku && productNode) {
		result.sku =
			stringVal(productNode.usItemId as unknown) ??
			stringVal(productNode.productId as unknown) ??
			null;
	}
	// Also try JSON-LD in case generic missed productID
	if (!result.sku) {
		const jsonLdItems = extractJsonLd(doc);
		const product = findByType(jsonLdItems, "Product");
		if (product) {
			result.sku = stringVal(product.sku) ?? stringVal(product.productID);
		}
	}

	// ── Currency from __NEXT_DATA__ ───────────────────────────────────────
	if (!result.currency && productNode) {
		const priceInfo = productNode.priceInfo as Record<string, unknown> | undefined;
		if (priceInfo) {
			const currentPrice = priceInfo.currentPrice as Record<string, unknown> | undefined;
			result.currency =
				stringVal(currentPrice?.currencyUnit as unknown)
				?? stringVal(currentPrice?.currencyCode as unknown)
				?? stringVal(priceInfo.currencyUnit as unknown)
				?? null;
		}
	}
	// Walmart is a US retailer — default to USD when price exists but currency wasn't found
	if (!result.currency && result.price) {
		result.currency = "USD";
	}

	// ── Rating from __NEXT_DATA__ ──────────────────────────────────────────
	if (!result.rating && productNode) {
		const reviewStats = productNode.reviewStatistics as Record<string, unknown> | undefined;
		if (reviewStats) {
			const avg = reviewStats.averageOverallRating;
			const cnt = reviewStats.totalReviewCount;
			if (avg !== undefined && avg !== null && !result.rating) result.rating = String(avg);
			if (cnt !== undefined && cnt !== null && !result.reviewCount)
				result.reviewCount = String(cnt);
		}
	}

	// ── Feature bullets ────────────────────────────────────────────────────
	// Priority: DOM data-testid="product-highlights" → idml.productHighlights
	if (!result.features?.length) {
		// DOM: Walmart uses data-testid="product-highlights" on the ul in browser renders
		const bulletEls = selectAll(
			'ul[data-testid="product-highlights"] li',
			doc,
		) as unknown as Element[];
		const features: string[] = [];
		for (const li of bulletEls) {
			const t = textContent(li).trim();
			if (t) features.push(t);
		}
		if (features.length > 0) result.features = features;
	}
	if (!result.features?.length && idml?.productHighlights) {
		// idml.productHighlights = [{name, value, iconURL}]
		const highlights = idml.productHighlights as Record<string, unknown>[];
		if (Array.isArray(highlights)) {
			const features: string[] = [];
			for (const h of highlights) {
				const name = typeof h.name === "string" ? h.name.trim() : "";
				const value = typeof h.value === "string" ? h.value.trim() : "";
				if (value) {
					features.push(name ? `${name}: ${value}` : value);
				}
			}
			if (features.length > 0) result.features = features;
		}
	}

	// ── Description ────────────────────────────────────────────────────────
	if (!result.description) {
		// DOM: browser-rendered description container
		const descEl = selectOne('[data-testid="product-description-content"]', doc) as Element | null;
		if (descEl) {
			result.description = renderMarkdown(descEl);
		}
	}
		if (!result.description && idml) {
			// idml.longDescription or shortDescription (HTML strings)
			const longDesc = idml.longDescription;
			const shortDesc = idml.shortDescription;
			const raw =
			typeof longDesc === "string" && longDesc.trim()
				? longDesc
				: typeof shortDesc === "string" && shortDesc.trim()
					? shortDesc
					: null;
			if (raw) {
				result.description = stripHtml(raw);
			}
		}
	if (!result.description) {
		result.description = getMeta(doc, "og:description");
	}

	// ── Specifications from idml ────────────────────────────────────────────
	if ((result.specifications?.length ?? 0) === 0 && idml?.specifications) {
		result.specifications ??= [];
		const specs = idml.specifications as Record<string, unknown>[];
		if (Array.isArray(specs)) {
			for (const s of specs) {
				const key = typeof s.name === "string" ? s.name.trim() : "";
				const value = typeof s.value === "string" ? s.value.trim() : "";
				if (key && value) result.specifications.push({ key, value });
			}
		}
	}

	// ── GTIN/UPC from __NEXT_DATA__ or JSON-LD ─────────────────────────────
	if (!result.gtin && productNode) {
		const productData = productNode as Record<string, unknown>;
		result.gtin = stringVal(productData.gtin13 as unknown)
			?? stringVal(productData.upc as unknown)
			?? stringVal(productData.gtin as unknown)
			?? null;
	}
	if (!result.gtin) {
		const jsonLdItems = extractJsonLd(doc);
		const product = findByType(jsonLdItems, "Product");
		if (product) {
			result.gtin = stringVal(product.gtin13) ?? stringVal(product.gtin) ?? stringVal(product.gtin12) ?? null;
		}
	}

	// ── Product images from __NEXT_DATA__ ────────────────────────────────
	if (!result.images && productNode) {
		const imageInfo = (productNode as Record<string, unknown>).imageInfo as Record<string, unknown> | undefined;
		const allImages = imageInfo?.allImages;
		if (Array.isArray(allImages)) {
			const images: string[] = [];
			for (const img of allImages) {
				const imgUrl = stringVal((img as Record<string, unknown>).url as unknown);
				if (imgUrl) images.push(imgUrl);
			}
			if (images.length > 0) result.images = images;
		}
	}

	// Final guard
	if (!result.name && !result.price && !result.features?.length && !result.description) {
		throw new Error("No Walmart product content found");
	}

	return result;
}
