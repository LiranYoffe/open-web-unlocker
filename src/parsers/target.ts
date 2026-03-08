/**
 * target.ts — Target product page parser.
 *
 * Strategy:
 *   1. parseGenericProduct() handles JSON-LD Product + universal itemprop/og: fallbacks.
 *   2. This wrapper augments with Target-specific DOM selectors (data-test attributes)
 *      for any fields that JSON-LD did not supply.
 *   3. Target embeds product data in window.__TGT_DATA__ (script tag, JSON.parse call).
 *      That JSON contains: product.price.formatted_current_price, product.item.primary_brand.name,
 *      product.ratings_and_reviews.statistics.rating.{average,count}, product.tcin,
 *      and product.children[0].item.product_description.{bullet_descriptions,downstream_description}.
 *
 * Selector priority: JSON-LD → __TGT_DATA__ script → [itemprop] → [data-test] → og: meta
 * Never use: [class*=...] substring class selectors
 */

import { selectAll, selectOne } from "css-select";
import type { Element } from "domhandler";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { getMeta, parseGenericProduct } from "./generic-product";
import type { ProductData } from "./page-data";

/**
 * Parse product data out of Target's window.__TGT_DATA__ embedded script.
 * The script tag uses: Object.defineProperty(window, '__TGT_DATA__', { value: deepFreeze(JSON.parse("...")) })
 * The JSON string is escaped with \" for quotes and \\ for backslashes.
 */
interface TgtProductData {
	name: string | null;
	price: string | null;
	currency: string | null;
	brand: string | null;
	sku: string | null;
	rating: string | null;
	reviewCount: string | null;
	description: string | null;
	features: string[];
	specifications: { key: string; value: string }[];
}

function parseTgtData(html: string): TgtProductData {
	const result: TgtProductData = {
		name: null,
		price: null,
		currency: null,
		brand: null,
		sku: null,
		rating: null,
		reviewCount: null,
		description: null,
		features: [],
		specifications: [],
	};

	// Find the __TGT_DATA__ script
	const tgtIdx = html.indexOf("'__TGT_DATA__'");
	if (tgtIdx < 0) return result;

	const jsonParseIdx = html.indexOf('JSON.parse("', tgtIdx);
	if (jsonParseIdx < 0) return result;

	const contentStart = jsonParseIdx + 'JSON.parse("'.length;

	// Walk the escaped JSON string to find its end (first unescaped `"`)
	let i = contentStart;
	let endIdx = -1;
	while (i < html.length) {
		const c = html[i];
		if (c === "\\") {
			i += 2; // skip the escaped char
		} else if (c === '"') {
			endIdx = i;
			break;
		} else {
			i += 1;
		}
	}
	if (endIdx < 0) return result;

	const escapedJson = html.slice(contentStart, endIdx);
	// Unescape: \" → " and \\ → \
	const jsonStr = escapedJson.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

	let data: unknown;
	try {
		data = JSON.parse(jsonStr);
	} catch {
		return result;
	}

	// Navigate: __PRELOADED_QUERIES__.queries[3][1].data.product
	const preloaded = (data as Record<string, unknown>).__PRELOADED_QUERIES__;
	if (!preloaded || typeof preloaded !== "object") return result;

	const queries = (preloaded as Record<string, unknown>).queries;
	if (!Array.isArray(queries)) return result;

	// Find the query that has a product key in data
	let productObj: Record<string, unknown> | null = null;
	for (const q of queries) {
		if (!Array.isArray(q) || q.length < 2) continue;
		const qdata = q[1] as Record<string, unknown> | undefined;
		if (!qdata || typeof qdata !== "object") continue;
		const innerData = qdata.data as Record<string, unknown> | undefined;
		if (innerData && typeof innerData === "object" && "product" in innerData) {
			productObj = innerData.product as Record<string, unknown> | null;
			break;
		}
	}
	if (!productObj) return result;

	// SKU: tcin
	const tcin = productObj.tcin;
	if (typeof tcin === "string" || typeof tcin === "number") {
		result.sku = String(tcin);
	}

	// Price: product.price.formatted_current_price
	const priceObj = productObj.price as Record<string, unknown> | undefined;
	if (priceObj) {
		const fp = priceObj.formatted_current_price;
		if (typeof fp === "string" && fp) {
			const match = fp.trim().match(/^([$€£¥₹])?\s*([\d,.]+)/);
			if (match) {
				const symbolMap: Record<string, string> = {
					$: "USD",
					"€": "EUR",
					"£": "GBP",
					"¥": "JPY",
					"₹": "INR",
				};
				result.price = match[2] ?? fp;
				result.currency = match[1] ? symbolMap[match[1]] ?? match[1] : null;
			} else {
				result.price = fp;
			}
		}
	}

	// Brand: product.item.primary_brand.name
	const itemObj = productObj.item as Record<string, unknown> | undefined;
	if (itemObj) {
		const primaryBrand = itemObj.primary_brand as Record<string, unknown> | undefined;
		if (primaryBrand && typeof primaryBrand.name === "string") {
			result.brand = primaryBrand.name || null;
		}
	}

	// Rating: product.ratings_and_reviews.statistics.rating.{average, count}
	const rrObj = productObj.ratings_and_reviews as Record<string, unknown> | undefined;
	if (rrObj) {
		const stats = rrObj.statistics as Record<string, unknown> | undefined;
		if (stats) {
			const ratingObj = stats.rating as Record<string, unknown> | undefined;
			if (ratingObj) {
				const avg = ratingObj.average;
				const cnt = ratingObj.count;
				if (avg !== undefined && avg !== null) result.rating = String(avg);
				if (cnt !== undefined && cnt !== null) result.reviewCount = String(cnt);
			}
		}
	}

	// Description + features from children[0].item.product_description
	const children = productObj.children;
	if (Array.isArray(children) && children.length > 0) {
		const child = children[0] as Record<string, unknown>;
		const childItem = child.item as Record<string, unknown> | undefined;
		if (childItem) {
			const prodDesc = childItem.product_description as Record<string, unknown> | undefined;
			if (prodDesc) {
				// downstream_description → description
				const downstream = prodDesc.downstream_description;
				if (typeof downstream === "string" && downstream.trim()) {
					result.description = downstream.trim();
				}

				// bullet_descriptions → features (strip HTML tags)
				const bullets = prodDesc.bullet_descriptions;
				if (Array.isArray(bullets)) {
					for (const b of bullets) {
						if (typeof b === "string") {
							// Remove HTML tags like <B>Key:</B>
							const cleaned = b.replace(/<[^>]+>/g, "").trim();
							if (cleaned) result.features.push(cleaned);
						}
					}
				}
			}
		}
	}

	return result;
}

export function parseTarget(html: string, url: string): ProductData {
	// Base parse: JSON-LD + itemprop + og: fallbacks
	const result = parseGenericProduct(html, url, "target");

	// Parse the document for DOM augmentation
	const doc = parseDocument(html);

	// ── __TGT_DATA__ script (Target's embedded product data) ──────────────
	const tgtData = parseTgtData(html);

	// ── Name fallbacks (Target-specific) ──────────────────────────────────
	if (!result.name) {
		// h1[data-test="product-title"] is present in static HTML
		const nameEl = selectOne('h1[data-test="product-title"]', doc) as Element | null;
		if (nameEl) {
			result.name = textContent(nameEl).trim() || null;
			if (!result.title) result.title = result.name;
		}
	}

	// ── Price (from __TGT_DATA__ — not in DOM on static fetch) ────────────
	if (!result.price && tgtData.price) {
		result.price = tgtData.price;
	}
	if (!result.currency && tgtData.currency) {
		result.currency = tgtData.currency;
	}

	// ── Brand (from __TGT_DATA__) ──────────────────────────────────────────
	if (!result.brand && tgtData.brand) {
		result.brand = tgtData.brand;
	}

	// ── SKU / TCIN (from __TGT_DATA__) ────────────────────────────────────
	if (!result.sku && tgtData.sku) {
		result.sku = tgtData.sku;
	}

	// ── Rating (from __TGT_DATA__) ─────────────────────────────────────────
	if (!result.rating && tgtData.rating) {
		result.rating = tgtData.rating;
	}
	if (!result.reviewCount && tgtData.reviewCount) {
		result.reviewCount = tgtData.reviewCount;
	}

	// DOM rating fallback: screen reader text "4 out of 5 stars with 16 reviews"
	if (!result.rating) {
		const ratingEl = selectOne('[data-test="ratings"] span', doc) as Element | null;
		if (ratingEl) {
			const ratingText = textContent(ratingEl).trim();
			// e.g. "4 out of 5 stars with 16 reviews"
			const ratingMatch =
				/^([\d.]+)\s+out\s+of\s+5\s+stars?(?:\s+with\s+([\d,]+)\s+reviews?)?/i.exec(ratingText);
			if (ratingMatch) {
				result.rating = ratingMatch[1] ?? null;
				if (ratingMatch[2] && !result.reviewCount) {
					result.reviewCount = ratingMatch[2].replace(/,/g, "");
				}
			}
		}
	}

	// ── Feature bullets ────────────────────────────────────────────────────
	// __TGT_DATA__ bullet_descriptions (from children[0])
	if (!result.features?.length && tgtData.features.length > 0) {
		result.features = tgtData.features;
	}

	// DOM fallback: [data-test="@web/ProductDetailPageHighlights"] li span
	if (!result.features?.length) {
		const bulletEls = selectAll(
			'[data-test="@web/ProductDetailPageHighlights"] li',
			doc,
		) as unknown as Element[];
		const features: string[] = [];
		for (const li of bulletEls) {
			const t = textContent(li).trim();
			if (t) features.push(t);
		}
		if (features.length > 0) result.features = features;
	}

	// ── Description ────────────────────────────────────────────────────────
	// __TGT_DATA__ downstream_description is better than og:description (which is a boilerplate
	// "Read reviews and buy X at Target..." string). Prefer it when available.
	if (tgtData.description) {
		result.description = tgtData.description;
	}

	// Final fallback to og:description (already set by parseGenericProduct, keep if no TGT_DATA)
	if (!result.description) {
		result.description = getMeta(doc, "og:description");
	}

	// ── Specifications ─────────────────────────────────────────────────────
	// Target's specification accordion is hidden in static HTML.
	// __TGT_DATA__ bullet_descriptions contain <B>Key:</B> Value pairs — use as specs.
	if ((result.specifications?.length ?? 0) === 0 && tgtData.features.length > 0) {
		result.specifications ??= [];
		for (const feature of tgtData.features) {
			// Pattern: "Key: Value" (from cleaned bullet like "Material: 95% Rayon, 5% Spandex")
			const colonIdx = feature.indexOf(":");
			if (colonIdx > 0) {
				const key = feature.slice(0, colonIdx).trim();
				const value = feature.slice(colonIdx + 1).trim();
				if (key && value) {
					result.specifications.push({ key, value });
				}
			}
		}
	}

	// Final guard
	if (!result.name && !result.price && !result.features?.length && !result.description) {
		throw new Error("No Target product content found");
	}

	return result;
}
