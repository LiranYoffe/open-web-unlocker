import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { ProductData, ProductReview, RatingHistogramEntry } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "aside", "svg"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

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
	return el?.attribs?.[attr]?.trim() || null;
}

function extractJsonLd(doc: Document): unknown[] {
	const scripts = selectAll(
		'script[type="application/ld+json"]',
		doc,
	) as unknown as Element[];
	const results: unknown[] = [];
	for (const script of scripts) {
		const raw = textContent(script).trim();
		if (!raw) continue;
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) results.push(...parsed);
			else results.push(parsed);
		} catch {
			// Ignore invalid JSON
		}
	}
	return results;
}

function findByType(
	items: unknown[],
	type: string,
): Record<string, unknown> | null {
	for (const item of items) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] === type) return obj;
		if (Array.isArray(obj["@graph"])) {
			const found = findByType(obj["@graph"] as unknown[], type);
			if (found) return found;
		}
	}
	return null;
}

function stringVal(v: unknown): string | null {
	return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Convert schema.org ItemAvailability URL to human text */
function availabilityText(url: string): string {
	const last = url.split("/").pop() ?? url;
	return last.replace(/([A-Z])/g, " $1").trim();
}

/**
 * Extract the twister `a-state` JSON data that Amazon embeds for variant/price info.
 * The script tag has: data-a-state='{"key":"desktop-twister-sort-filter-data"}'>{ ... }</script>
 */
function extractTwisterData(doc: Document): Record<string, unknown> | null {
	const stateScripts = selectAll(
		'script[type="a-state"]',
		doc,
	) as unknown as Element[];
	for (const script of stateScripts) {
		const stateAttr = script.attribs?.["data-a-state"];
		if (!stateAttr) continue;
		try {
			const meta = JSON.parse(stateAttr) as Record<string, unknown>;
			if (meta.key === "desktop-twister-sort-filter-data") {
				const raw = textContent(script).trim();
				if (raw) return JSON.parse(raw) as Record<string, unknown>;
			}
		} catch {
			// Ignore parse errors
		}
	}
	return null;
}

interface TwisterPriceInfo {
	price: string | null;
	currency: string | null;
	offerType: string | null;
}

/**
 * Extract price, currency, and offer type from the twister sort-filter data.
 * Walks the `sortedDimValuesForAllDims` object, finds the SELECTED dimension
 * value, and reads its slot displayData.
 */
function extractTwisterPrice(
	twister: Record<string, unknown>,
): TwisterPriceInfo {
	const result: TwisterPriceInfo = {
		price: null,
		currency: null,
		offerType: null,
	};

	const dims = twister.sortedDimValuesForAllDims as
		| Record<string, unknown[]>
		| undefined;
	if (!dims) return result;

	for (const dimValues of Object.values(dims)) {
		if (!Array.isArray(dimValues)) continue;
		for (const dimVal of dimValues) {
			const dv = dimVal as Record<string, unknown>;
			if (dv.dimensionValueState !== "SELECTED") continue;

			const slots = dv.slots as unknown[] | undefined;
			if (!Array.isArray(slots)) continue;

			for (const slot of slots) {
				const s = slot as Record<string, unknown>;
				const displayData = s.displayData as
					| Record<string, unknown>
					| undefined;
				if (!displayData) continue;

				const rawPrice = displayData.priceWithoutCurrencySymbol;
				if (rawPrice !== undefined && rawPrice !== null) {
					result.price = String(rawPrice);
				}

				const olpMsg = stringVal(
					displayData.olpMessage as string | undefined,
				);
				if (olpMsg) {
					// olpMessage format: "1 option from ILS 157.27" or "1 option from $49.99"
					const currencyMatch = olpMsg.match(
						/from\s+([A-Z]{3})\s/,
					);
					if (currencyMatch?.[1]) {
						result.currency = currencyMatch[1];
					} else if (olpMsg.includes("$")) {
						result.currency = "USD";
					} else if (olpMsg.includes("€")) {
						result.currency = "EUR";
					} else if (olpMsg.includes("£")) {
						result.currency = "GBP";
					}
				}

				const offerType = stringVal(
					displayData.offerType as string | undefined,
				);
				if (offerType) result.offerType = offerType;

				// Found a selected dim with slot data — use it
				if (result.price) return result;
			}
		}
	}

	return result;
}

export function parseAmazon(html: string, url: string): ProductData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	let name: string | null = null;
	let brand: string | null = null;
	let sku: string | null = null;
	let price: string | null = null;
	let currency: string | null = null;
	let availability: string | null = null;
	let condition: string | null = null;
	let rating: string | null = null;
	let reviewCount: string | null = null;

	// ── JSON-LD Product (most stable source, when present) ───────────────
	const jsonLdItems = extractJsonLd(doc);
	const product = findByType(jsonLdItems, "Product");

	if (product) {
		name = stringVal(product.name);

		const brandObj = product.brand as Record<string, unknown> | undefined;
		brand = brandObj ? stringVal(brandObj.name) : null;

		sku = stringVal(product.sku);

		const offersRaw = product.offers;
		const offers = Array.isArray(offersRaw)
			? (offersRaw as unknown[])
			: offersRaw
				? [offersRaw]
				: [];
		for (const offer of offers) {
			const o = offer as Record<string, unknown>;
			const priceVal = o.price;
			if (priceVal !== undefined && priceVal !== null) {
				price = String(priceVal);
			}
			currency = stringVal(o.priceCurrency);
			const avail = stringVal(o.availability);
			if (avail) availability = availabilityText(avail);
			const cond = stringVal(o.itemCondition);
			if (cond) condition = availabilityText(cond);
			break;
		}

		const ratingObj = product.aggregateRating as
			| Record<string, unknown>
			| undefined;
		if (ratingObj) {
			const val = ratingObj.ratingValue;
			const count = ratingObj.reviewCount ?? ratingObj.ratingCount;
			if (val !== undefined) rating = String(val);
			if (count !== undefined) reviewCount = String(count);
		}
	}

	// ── Twister a-state data (Amazon's inline variant/price JSON) ────────
	const twister = extractTwisterData(doc);
	if (twister) {
		const tp = extractTwisterPrice(twister);
		if (!price && tp.price) price = tp.price;
		if (!currency && tp.currency) currency = tp.currency;
		if (!condition && tp.offerType) {
			// Map Amazon's offer types to human-readable condition
			if (tp.offerType === "newOffer") condition = "New";
			else if (tp.offerType === "usedOffer") condition = "Used";
			else if (tp.offerType === "refurbishedOffer")
				condition = "Refurbished";
			else condition = tp.offerType;
		}
	}

	// ── DOM fallbacks using stable IDs ───────────────────────────────────

	// Product name (#productTitle — stable ID)
	if (!name) {
		name = getText("#productTitle", doc);
	}

	// Brand (#bylineInfo — stable ID link with "Brand: X" or "Visit the X Store")
	if (!brand) {
		const bylineText = getText("#bylineInfo", doc);
		if (bylineText) {
			const brandPrefixMatch = bylineText.match(/^Brand:\s*(.+)/i);
			const storeMatch = bylineText.match(
				/^Visit the\s+(.+?)\s+Store$/i,
			);
			if (brandPrefixMatch?.[1]) brand = brandPrefixMatch[1].trim();
			else if (storeMatch?.[1]) brand = storeMatch[1].trim();
			else brand = bylineText;
		}
	}

	// SKU / ASIN (#ASIN hidden input — stable ID)
	if (!sku) {
		sku = getAttr("#ASIN", "value", doc);
	}
	// Fallback: extract ASIN from URL pattern /dp/XXXXXXXXXX
	if (!sku) {
		const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
		if (asinMatch?.[1]) sku = asinMatch[1];
	}

	// Rating (#acrPopover title attribute — stable ID, e.g. "4.7 out of 5 stars")
	if (!rating) {
		const ratingTitle = getAttr("#acrPopover", "title", doc);
		if (ratingTitle) {
			const m = ratingTitle.match(/([\d.]+)\s+out\s+of/);
			if (m?.[1]) rating = m[1];
		}
	}

	// Review count (#acrCustomerReviewText — stable ID, e.g. "(184,843)" or "184,843 Reviews")
	if (!reviewCount) {
		const reviewText = getText("#acrCustomerReviewText", doc);
		if (reviewText) {
			// Strip parentheses, commas, and trailing text to get the number
			const m = reviewText.match(/([\d,]+)/);
			if (m?.[1]) reviewCount = m[1].replace(/,/g, "");
		}
	}

	// Availability (#availability — stable ID, extract visible text)
	if (!availability) {
		const availEl = selectOne("#availability", doc) as Element | null;
		if (availEl) {
			// Get direct text, skip script/hidden children
			const raw = textContent(availEl).trim();
			// Clean up whitespace and filter out empty/script content
			const cleaned = raw.replace(/\s+/g, " ").trim();
			if (cleaned && cleaned.length > 2 && cleaned.length < 200) {
				availability = cleaned;
			}
		}
	}
	// Fallback: if twister has offer data, infer basic availability
	if (!availability && twister) {
		const tp = extractTwisterPrice(twister);
		if (tp.price) availability = "In Stock";
	}

	// Price fallback from DOM: look for price in the buybox or corePrice area
	if (!price) {
		// Try apex price display (span with a-price inside corePrice area)
		const priceWhole = getText(
			"#corePrice_desktop span[data-a-color='price'] span[aria-hidden='true']",
			doc,
		);
		if (priceWhole) {
			// Format: "$49.99" — strip currency symbol
			const m = priceWhole.match(/([\d,.]+)/);
			if (m?.[1]) price = m[1];
		}
	}

	// Currency fallback from page footer (#icp-touch-link-cop)
	if (!currency) {
		const currencyText = getText("#icp-touch-link-cop", doc);
		if (currencyText) {
			const m = currencyText.match(/([A-Z]{3})/);
			if (m?.[1]) currency = m[1];
		}
	}

	// Feature bullets (stable ID, stable structure)
	const features: string[] = [];
	const bullets = selectAll(
		"#feature-bullets ul li",
		doc,
	) as unknown as Element[];
	if (bullets.length > 0) {
		for (const li of bullets) {
			const t = textContent(li).trim();
			if (
				t.length > 0 &&
				!t.toLowerCase().includes("make sure this fits")
			) {
				features.push(t);
			}
		}
	}

	// Product description (#productDescription — stable ID)
	let description: string | null = null;
	const descEl = selectOne("#productDescription", doc) as Element | null;
	if (descEl) {
		const md = nhm.translate(getInnerHTML(descEl));
		const trimmed = md.replace(/\n{3,}/g, "\n\n").trim();
		if (trimmed) description = trimmed;
	}

	// A+ content (enhanced description, stable ID, shown when no standard desc)
	if (!description) {
		const aplusEl = selectOne("#aplus", doc) as Element | null;
		if (aplusEl) {
			const md = nhm.translate(getInnerHTML(aplusEl));
			const trimmed = md.replace(/\n{3,}/g, "\n\n").trim();
			if (trimmed) description = trimmed;
		}
	}

	// ── Specifications ──────────────────────────────────────────────────
	const specifications: { key: string; value: string }[] = [];
	const seenKeys = new Set<string>();

	// Source 1: Product overview table (#productOverview_feature_div — stable ID)
	const overviewEl = selectOne(
		"#productOverview_feature_div",
		doc,
	) as Element | null;
	if (overviewEl) {
		const rows = selectAll("tr", overviewEl) as unknown as Element[];
		for (const row of rows) {
			const cells = selectAll("td, th", row) as unknown as Element[];
			const keyCell = cells[0];
			const valCell = cells[1];
			if (keyCell && valCell) {
				const key = textContent(keyCell).trim();
				const val = textContent(valCell).trim();
				if (key && val && !seenKeys.has(key)) {
					seenKeys.add(key);
					specifications.push({ key, value: val });
				}
			}
		}
	}

	// Source 2: Tech specs tables (#techSpecs_feature_div or #productDetails_techSpec_section_1)
	for (const tableId of [
		"#techSpecs_feature_div",
		"#productDetails_techSpec_section_1",
		"#productDetails_detailBullets_sections1",
	]) {
		const tableEl = selectOne(tableId, doc) as Element | null;
		if (!tableEl) continue;
		const rows = selectAll("tr", tableEl) as unknown as Element[];
		for (const row of rows) {
			const cells = selectAll("td, th", row) as unknown as Element[];
			const keyCell = cells[0];
			const valCell = cells[1];
			if (keyCell && valCell) {
				const key = textContent(keyCell).trim();
				const val = textContent(valCell).trim();
				if (key && val && !seenKeys.has(key)) {
					seenKeys.add(key);
					specifications.push({ key, value: val });
				}
			}
		}
	}

	// Source 3: A+ content spec tables (two-column tables inside content-grid-block)
	// These have <td><p><strong>Key</strong></p></td><td><p>Value</p></td>
	if (specifications.length === 0) {
		const allTables = selectAll("table", doc) as unknown as Element[];
		for (const table of allTables) {
			const rows = selectAll("tr", table) as unknown as Element[];
			for (const row of rows) {
				const cells = selectAll("td", row) as unknown as Element[];
				if (cells.length !== 2) continue;
				const keyCell = cells[0] as Element | undefined;
				const valCell = cells[1] as Element | undefined;
				if (!keyCell || !valCell) continue;
				// A+ spec tables use <strong> for the key label
				const strongEl = selectOne("strong", keyCell) as Element | null;
				if (!strongEl) continue;
				const key = textContent(strongEl).trim();
				const val = textContent(valCell).trim();
				if (key && val && !seenKeys.has(key)) {
					seenKeys.add(key);
					specifications.push({ key, value: val });
				}
			}
		}
	}

	// ── Rating histogram (aria-label on histogram bars) ─────────────────
	const ratingHistogram: RatingHistogramEntry[] = [];
	const histogramEls = selectAll(
		'[aria-label*="percent of reviews have"]',
		doc,
	) as unknown as Element[];
	for (const el of histogramEls) {
		const label = el.attribs?.["aria-label"] ?? "";
		// "89 percent of reviews have 5 stars"
		const m = label.match(/(\d+)\s+percent.*?(\d)\s+star/);
		if (m?.[1] && m?.[2]) {
			ratingHistogram.push({
				stars: Number(m[2]),
				percentage: Number(m[1]),
			});
		}
	}
	// Sort descending by stars (5→1)
	ratingHistogram.sort((a, b) => b.stars - a.stars);

	// ── Total rating count (data-hook="total-review-count") ─────────────
	let totalRatingCount: string | null = null;
	const totalRatingEl = selectOne(
		'[data-hook="total-review-count"]',
		doc,
	) as Element | null;
	if (totalRatingEl) {
		const raw = textContent(totalRatingEl).trim();
		// "14,495 global ratings" → "14495"
		const m = raw.match(/([\d,]+)/);
		if (m?.[1]) totalRatingCount = m[1].replace(/,/g, "");
	}

	// ── Top reviews (data-hook="review" containers) ─────────────────────
	const topReviews: ProductReview[] = [];
	const reviewContainers = selectAll(
		'[data-hook="review"]',
		doc,
	) as unknown as Element[];
	for (const container of reviewContainers) {
		// Author: .a-profile-name inside this review
		const authorEl = selectOne(
			"[class~='a-profile-name']",
			container,
		) as Element | null;
		const author = authorEl ? textContent(authorEl).trim() || null : null;

		// Star rating: data-hook="review-star-rating" → "5.0 out of 5 stars"
		const starEl = selectOne(
			'[data-hook="review-star-rating"]',
			container,
		) as Element | null;
		let reviewRating: string | null = null;
		if (starEl) {
			const starText = textContent(starEl).trim();
			const m = starText.match(/([\d.]+)\s+out\s+of/);
			if (m?.[1]) reviewRating = m[1];
		}

		// Title: data-hook="review-title" — contains star icon + title text
		// The <a> contains an <i> for stars then the actual title
		const titleEl = selectOne(
			'[data-hook="review-title"]',
			container,
		) as Element | null;
		let reviewTitle: string | null = null;
		if (titleEl) {
			const fullText = textContent(titleEl).trim();
			// Strip the "X.X out of 5 stars" prefix that comes from the nested <i>
			reviewTitle =
				fullText.replace(/[\d.]+\s+out\s+of\s+\d+\s+stars\s*/i, "").trim() ||
				null;
		}

		// Body: data-hook="review-body"
		const bodyEl = selectOne(
			'[data-hook="review-body"]',
			container,
		) as Element | null;
		const body = bodyEl ? textContent(bodyEl).trim() : "";
		if (!body) continue; // Skip reviews with no body

		// Date: data-hook="review-date" — "Reviewed in the United States on December 10, 2023"
		const dateEl = selectOne(
			'[data-hook="review-date"]',
			container,
		) as Element | null;
		let reviewDate: string | null = null;
		if (dateEl) {
			const dateText = textContent(dateEl).trim();
			const m = dateText.match(/on\s+(.+)$/);
			reviewDate = m?.[1] ?? dateText;
		}

		// Helpful votes: data-hook="helpful-vote-statement" — "45 people found this helpful"
		const helpfulEl = selectOne(
			'[data-hook="helpful-vote-statement"]',
			container,
		) as Element | null;
		let helpfulVotes: string | null = null;
		if (helpfulEl) {
			const helpText = textContent(helpfulEl).trim();
			const m = helpText.match(/([\d,]+)/);
			if (m?.[1]) helpfulVotes = m[1].replace(/,/g, "");
		}

		// Verified: data-hook="avp-badge"
		const verifiedEl = selectOne(
			'[data-hook="avp-badge"]',
			container,
		) as Element | null;
		const verified = verifiedEl !== null;

		topReviews.push({
			author,
			rating: reviewRating,
			date: reviewDate,
			title: reviewTitle,
			body,
			helpfulVotes,
			verified,
			variant: null,
		});
	}

	// Seller/merchant name
	let seller: string | null = null;
	const merchantEl = selectOne("#merchant-info", doc) as Element | null;
	if (merchantEl) {
		const merchantText = textContent(merchantEl).trim();
		const soldByMatch = merchantText.match(/(?:sold|ships from and sold)\s+by\s+([^.]+)/i);
		if (soldByMatch?.[1]) seller = soldByMatch[1].trim();
	}
	if (!seller) {
		seller = getText("#sellerProfileTriggerId", doc);
	}

	if (
		!name &&
		features.length === 0 &&
		!description &&
		specifications.length === 0
	) {
		throw new Error("No Amazon product content found");
	}

	return {
		type: "product",
		title: name || pageTitle,
		url,
		platform: "amazon",
		name,
		brand,
		sku,
		price,
		currency,
		availability,
		condition,
		rating,
		reviewCount,
		totalRatingCount,
		ratingHistogram,
		topReviews,
		features,
		specifications,
		description,
		seller,
	};
}
