import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { ProductSearchData, ProductSearchResult } from "./page-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getAttr(
	selector: string,
	attr: string,
	root: Document | Element,
): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? getAttributeValue(el, attr)?.trim() || null : null;
}

function normalizeText(value: string | null | undefined): string | null {
	if (!value) return null;
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized || null;
}

type AmazonListPageKind =
	| "best-sellers"
	| "new-releases"
	| "movers-and-shakers";

interface AmazonListMetadata {
	position: number | null;
	salesRank: string | null;
	previousSalesRank: string | null;
	salesRankChange: string | null;
}

/**
 * Extract the search query from the URL's `k` parameter.
 */
function extractQuery(url: string): string | null {
	try {
		const u = new URL(url);
		const k = u.searchParams.get("k");
		return k ? k.replace(/\+/g, " ") : null;
	} catch {
		return null;
	}
}

/**
 * Parse a price string like "ILS\u00a0176.14" or "$49.99" into
 * { value, currency }.
 */
function parsePrice(raw: string): { value: string; currency: string | null } {
	// Remove HTML entities and non-breaking spaces
	const cleaned = raw
		.replace(/&nbsp;/g, " ")
		.replace(/\u00a0/g, " ")
		.replace(/List:\s*/i, "")
		.trim();

	// Pattern: CURRENCY AMOUNT  or SYMBOL AMOUNT
	const currCodeMatch = cleaned.match(/^([A-Z]{2,3})\s+([\d,.]+)$/);
	if (currCodeMatch) {
		return { value: currCodeMatch[2]!, currency: currCodeMatch[1]! };
	}

	// Pattern: $49.99 / €49.99 / £49.99
	const symbolMatch = cleaned.match(/^([$€£¥₹])\s*([\d,.]+)$/);
	if (symbolMatch) {
		const symbolMap: Record<string, string> = {
			$: "USD",
			"€": "EUR",
			"£": "GBP",
			"¥": "JPY",
			"₹": "INR",
		};
		return {
			value: symbolMatch[2]!,
			currency: symbolMap[symbolMatch[1]!] ?? symbolMatch[1]!,
		};
	}

	// Fallback: extract digits
	const numMatch = cleaned.match(/([\d,.]+)/);
	return { value: numMatch?.[1] ?? cleaned, currency: null };
}

/**
 * Build the Amazon product URL from an ASIN and the search URL's origin.
 */
function buildProductUrl(
	linkHref: string | null,
	asin: string,
	searchUrl: string,
): string | null {
	if (linkHref) {
		try {
			const origin = new URL(searchUrl).origin;
			const cleanHref = linkHref.split("?")[0] ?? linkHref;
			const canonicalMatch =
				cleanHref.match(/^(\/.*?\/dp\/[A-Z0-9]{10})/i) ??
				cleanHref.match(/^(\/dp\/[A-Z0-9]{10})/i);
			if (canonicalMatch?.[1]) {
				return `${origin}${canonicalMatch[1]}`;
			}
			return `${origin}${cleanHref}`;
		} catch {
			// fall through
		}
	}
	try {
		return `${new URL(searchUrl).origin}/dp/${asin}`;
	} catch {
		return null;
	}
}

function getAmazonListPageKind(pathname: string): AmazonListPageKind | null {
	if (/\/zgbs\/|^\/gp\/bestsellers(?:[/?]|$)/i.test(pathname)) {
		return "best-sellers";
	}
	if (/^\/gp\/new-releases(?:[/?]|$)/i.test(pathname)) {
		return "new-releases";
	}
	if (/^\/gp\/movers-and-shakers(?:[/?]|$)/i.test(pathname)) {
		return "movers-and-shakers";
	}
	return null;
}

function extractAmazonListCategory(
	doc: Document,
	pageTitle: string | null,
): string | null {
	const current = normalizeText(getText('span[aria-current="page"]', doc));
	if (current) {
		return current.replace(/\(\s*current\s*\)/i, "").trim() || null;
	}

	const headings = selectAll("h1", doc) as unknown as Element[];
	for (const headingEl of headings) {
		const heading = normalizeText(textContent(headingEl));
		if (!heading) continue;
		const categoryMatch = heading.match(
			/^(?:Best Sellers|New Releases|Movers\s*&\s*Shakers)\s+in\s+(.+)$/i,
		);
		if (categoryMatch?.[1]) {
			return categoryMatch[1].trim() || null;
		}
	}

	const titleMatch = pageTitle?.match(
		/in\s+(.+?)(?:\s+sales rank over the past 24 hours|$)/i,
	);
	return titleMatch?.[1]?.trim() ?? null;
}

function extractAmazonListMetadata(doc: Document): Map<string, AmazonListMetadata> {
	const listMetadata = new Map<string, AmazonListMetadata>();
	const grids = selectAll(
		'div.p13n-desktop-grid[data-client-recs-list]',
		doc,
	) as unknown as Element[];

	for (const grid of grids) {
		const raw = getAttributeValue(grid, "data-client-recs-list");
		if (!raw) continue;
		try {
			const parsed = JSON.parse(raw) as Array<{
				id?: string;
				metadataMap?: Record<string, unknown>;
			}>;
			for (const entry of parsed) {
				if (!entry?.id) continue;
				const metadataMap = entry.metadataMap ?? {};
				const positionRaw = metadataMap["render.zg.rank"];
				const position =
					typeof positionRaw === "string" && positionRaw
						? Number.parseInt(positionRaw, 10)
						: null;
				const salesRankRaw = metadataMap["render.zg.bsms.currentSalesRank"];
				const previousSalesRankRaw =
					metadataMap["render.zg.bsms.twentyFourHourOldSalesRank"];
				const salesRankChangeRaw =
					metadataMap["render.zg.bsms.percentageChange"];
				listMetadata.set(entry.id, {
					position: Number.isFinite(position) ? position : null,
					salesRank:
						typeof salesRankRaw === "string" && salesRankRaw.trim()
							? salesRankRaw.trim()
							: null,
					previousSalesRank:
						typeof previousSalesRankRaw === "string" &&
						previousSalesRankRaw.trim()
							? previousSalesRankRaw.trim()
							: null,
					salesRankChange:
						typeof salesRankChangeRaw === "string" &&
						salesRankChangeRaw.trim()
							? `${salesRankChangeRaw.trim()}%`
							: null,
				});
			}
		} catch {
			// Ignore malformed list metadata.
		}
	}

	return listMetadata;
}

function extractAmazonListPrice(
	container: Element,
): { price: string | null; currency: string | null } {
	const priceEls = selectAll(
		".p13n-sc-price",
		container,
	) as unknown as Element[];
	let rawPrices = priceEls
		.map((el) => normalizeText(textContent(el)))
		.filter((value): value is string => Boolean(value));
	if (rawPrices.length === 0) {
		const offerText = normalizeText(getText(".a-color-secondary", container));
		if (offerText) {
			rawPrices = [...offerText.matchAll(/([A-Z]{2,3}\s*[\d,.]+|[$€£¥₹]\s*[\d,.]+)/g)]
				.map((match) => normalizeText(match[1]))
				.filter((value): value is string => Boolean(value));
		}
	}
	const uniquePrices = [...new Set(rawPrices)];
	if (uniquePrices.length === 0) {
		return { price: null, currency: null };
	}

	const parsedPrices = uniquePrices.map((raw) => parsePrice(raw));
	const currencies = [
		...new Set(
			parsedPrices
				.map((parsed) => parsed.currency)
				.filter((currency): currency is string => Boolean(currency)),
		),
	];
	const price = parsedPrices.map((parsed) => parsed.value).join(" - ");
	return {
		price: price || null,
		currency: currencies.length === 1 ? currencies[0] ?? null : null,
	};
}

function extractSearchResults(doc: Document, url: string): ProductSearchResult[] {
	const containers = selectAll(
		'div[data-component-type="s-search-result"]',
		doc,
	) as unknown as Element[];

	const results: ProductSearchResult[] = [];

	for (const container of containers) {
		const asin = getAttributeValue(container, "data-asin");
		if (!asin || asin.length === 0) continue;

		const nameText = getText("h2 span", container);
		if (!nameText) continue;

		const h2Link = getAttr("h2 a", "href", container);
		const directLink = getAttr(`a[href*="/dp/${asin}"]`, "href", container);
		const productUrl = buildProductUrl(
			directLink ?? h2Link,
			asin,
			url,
		);

		let price: string | null = null;
		let currency: string | null = null;
		let listPrice: string | null = null;

		const priceRecipe = selectOne(
			'[data-cy="price-recipe"]',
			container,
		) as Element | null;
		if (priceRecipe) {
			const offscreenSpans = selectAll(
				"span.a-offscreen",
				priceRecipe,
			) as unknown as Element[];
			for (const span of offscreenSpans) {
				const raw = textContent(span).trim();
				if (!raw) continue;
				const isListPrice = raw.toLowerCase().startsWith("list:");
				const parsed = parsePrice(raw);
				if (isListPrice) {
					listPrice = parsed.value;
				} else if (!price) {
					price = parsed.value;
					currency = parsed.currency;
				}
			}

			if (!price) {
				const priceSpan = selectOne(
					"span.a-price span.a-offscreen",
					priceRecipe,
				) as Element | null;
				if (priceSpan) {
					const raw = textContent(priceSpan).trim();
					if (raw) {
						const parsed = parsePrice(raw);
						price = parsed.value;
						currency = parsed.currency;
					}
				}
			}
		}

		let rating: string | null = null;
		let reviewCount: string | null = null;

		const reviewsBlock = selectOne(
			'[data-cy="reviews-block"]',
			container,
		) as Element | null;
		if (reviewsBlock) {
			const ratingSpans = selectAll(
				"span[aria-label]",
				reviewsBlock,
			) as unknown as Element[];
			for (const span of ratingSpans) {
				const label = getAttributeValue(span, "aria-label") ?? "";
				const ratingMatch = label.match(
					/([\d.]+)\s+out\s+of\s+\d+\s+stars/,
				);
				if (ratingMatch) {
					rating = ratingMatch[1]!;
					break;
				}
			}

			for (const span of ratingSpans) {
				const label = getAttributeValue(span, "aria-label") ?? "";
				const countMatch = label.match(/([\d,]+)\s+rating/);
				if (countMatch) {
					reviewCount = countMatch[1]!.replace(/,/g, "");
					break;
				}
			}
		}

		const imageUrl = getAttr("img.s-image", "src", container);

		let sponsored = false;
		const allSpans = selectAll(
			"span",
			container,
		) as unknown as Element[];
		for (const span of allSpans) {
			const t = textContent(span).trim();
			if (t === "Sponsored") {
				sponsored = true;
				break;
			}
		}
		if (!sponsored) {
			const allLinks = selectAll(
				"a[aria-label]",
				container,
			) as unknown as Element[];
			for (const link of allLinks) {
				const label = getAttributeValue(link, "aria-label") ?? "";
				if (
					label.includes("Sponsored") ||
					label.includes("ad feedback")
				) {
					sponsored = true;
					break;
				}
			}
		}

		let prime = false;
		const primeIcon = selectOne(
			"i.a-icon-prime",
			container,
		) as Element | null;
		if (primeIcon) {
			prime = true;
		}
		if (!prime) {
			const deliveryBlock = selectOne(
				'[data-cy="delivery-recipe"]',
				container,
			) as Element | null;
			if (deliveryBlock) {
				const deliveryText = textContent(deliveryBlock).trim();
				if (/Amazon Prime|Prime delivery/i.test(deliveryText)) {
					prime = true;
				}
			}
		}

		let badge: string | null = null;
		const badgeEl = selectOne(
			'[data-cy="s-pc-faceout-badge"]',
			container,
		) as Element | null;
		if (badgeEl) {
			const badgeText = textContent(badgeEl).trim();
			const badgeMatch = badgeText.match(
				/(Overall Pick|Best Seller|Amazon'?s Choice|Limited time deal|Climate Pledge)/i,
			);
			if (badgeMatch) {
				badge = badgeMatch[1]!;
			}
		}
		if (!badge) {
			const statusBadge = selectOne(
				'[data-component-type="s-status-badge-component"]',
				container,
			) as Element | null;
			if (statusBadge) {
				const props = getAttributeValue(
					statusBadge,
					"data-component-props",
				);
				if (props) {
					try {
						const parsed = JSON.parse(props) as Record<
							string,
							unknown
						>;
						const badgeType = parsed.badgeType as
							| string
							| undefined;
						if (badgeType === "amazons-choice") {
							badge = "Amazon's Choice";
						} else if (badgeType === "best-seller") {
							badge = "Best Seller";
						} else if (badgeType) {
							badge = badgeType
								.replace(/-/g, " ")
								.replace(/\b\w/g, (c) => c.toUpperCase());
						}
					} catch {
						// Ignore parse errors
					}
				}
			}
		}

		let boughtRecently: string | null = null;
		for (const span of allSpans) {
			const t = textContent(span).trim();
			if (/\d.*bought\s+in\s+past\s+month/i.test(t)) {
				boughtRecently = t;
				break;
			}
		}

		results.push({
			asin,
			name: nameText,
			url: productUrl,
			price,
			currency,
			listPrice,
			rating,
			reviewCount,
			imageUrl,
			sponsored,
			prime,
			badge,
			boughtRecently,
		});
	}

	return results;
}

function extractAmazonListResults(doc: Document, url: string): ProductSearchResult[] {
	const containers = selectAll(
		'div.zg-grid-general-faceout div[data-asin], div.p13n-grid-content div[data-asin]',
		doc,
	) as unknown as Element[];
	const listMetadata = extractAmazonListMetadata(doc);

	const results: ProductSearchResult[] = [];

	for (const container of containers) {
		const asin = getAttributeValue(container, "data-asin");
		if (!asin || asin.length === 0) continue;

		const metadata = listMetadata.get(asin);
		const rankText = normalizeText(getText(".zg-bdg-text", container));
		const positionMatch = rankText?.match(/#?(\d+)/);
		const position =
			metadata?.position ??
			(positionMatch?.[1] ? Number.parseInt(positionMatch[1], 10) : null);

		const nameText =
			normalizeText(getText('a[href*="/dp/"][role="link"] span > div', container)) ??
			normalizeText(getText('a[href*="/dp/"][role="link"] span', container)) ??
			normalizeText(getAttr("img", "alt", container));
		if (!nameText) continue;

		const productHref =
			getAttr('a[href*="/dp/"][role="link"]', "href", container) ??
			getAttr(`a[href*="/dp/${asin}"]`, "href", container);
		const productUrl = buildProductUrl(productHref, asin, url);

		let rating: string | null = null;
		let reviewCount: string | null = null;
		const ratingLink = selectOne(
			'a[aria-label*="out of 5 stars"]',
			container,
		) as Element | null;
		if (ratingLink) {
			const label = getAttributeValue(ratingLink, "aria-label") ?? "";
			const ratingMatch = label.match(/([\d.]+)\s+out of 5 stars/i);
			const countMatch = label.match(/([\d,]+)\s+ratings?/i);
			rating = ratingMatch?.[1] ?? null;
			reviewCount = countMatch?.[1]?.replace(/,/g, "") ?? null;
		}

		const { price, currency } = extractAmazonListPrice(container);

		const imageUrl =
			getAttr("img.p13n-product-image", "src", container) ??
			getAttr("img[data-a-dynamic-image]", "src", container);
		const movementFields =
			metadata &&
			(metadata.salesRank ||
				metadata.previousSalesRank ||
				metadata.salesRankChange)
				? {
					salesRank: metadata.salesRank ?? null,
					previousSalesRank: metadata.previousSalesRank ?? null,
					salesRankChange: metadata.salesRankChange ?? null,
				}
				: {};

		results.push({
			position,
			asin,
			name: nameText,
			url: productUrl,
			price,
			currency,
			listPrice: null,
			rating,
			reviewCount,
			imageUrl,
			sponsored: false,
			prime: undefined,
			badge: null,
			boughtRecently: null,
			...movementFields,
		});
	}

	return results;
}

// ── Parser ────────────────────────────────────────────────────────────────────

export function parseAmazonSearch(
	html: string,
	url: string,
): ProductSearchData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const pathname = new URL(url).pathname;
	const listPageKind = getAmazonListPageKind(pathname);
	const isAmazonListPage = listPageKind !== null;
	const query = isAmazonListPage
		? extractAmazonListCategory(doc, pageTitle)
		: extractQuery(url);

	// Total results count — Amazon shows "1-16 of over 10,000 results"
	// in a span inside the result info bar
	let totalResults: string | null = null;
	if (!isAmazonListPage) {
		const resultInfoEls = selectAll(
			'[data-component-type="s-result-info-bar"] span',
			doc,
		) as unknown as Element[];
		for (const el of resultInfoEls) {
			const t = textContent(el).trim();
			const m = t.match(/([\d,]+)\s+results/);
			if (m) {
				totalResults = m[1]!.replace(/,/g, "");
				break;
			}
		}
	}

	const results = isAmazonListPage
		? extractAmazonListResults(doc, url)
		: extractSearchResults(doc, url);

	if (results.length === 0) {
		throw new Error(
			isAmazonListPage
				? "No Amazon list results found"
				: "No Amazon search results found",
		);
	}

	return {
		type: "product-search",
		title: pageTitle,
		url,
		platform: "amazon",
		query,
		...(totalResults ? { totalResults } : {}),
		results,
	};
}
