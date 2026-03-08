/**
 * generic-product.ts — Shared helpers and base parser for product pages.
 *
 * Used by walmart.ts, target.ts, and etsy.ts.  Each thin wrapper calls
 * parseGenericProduct() to handle JSON-LD + universal fallbacks, then
 * augments the result with site-specific DOM selectors.
 */

import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { ProductData } from "./page-data";

// ── Shared NHM instance ────────────────────────────────────────────────────

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "aside", "svg"],
});

// ── DOM helpers ────────────────────────────────────────────────────────────

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

export function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

export function renderMarkdown(element: Element): string | null {
	const md = nhm.translate(getInnerHTML(element));
	const trimmed = md.replace(/\n{3,}/g, "\n\n").trim();
	return trimmed || null;
}

// ── JSON-LD helpers ────────────────────────────────────────────────────────

export function extractJsonLd(doc: Document): unknown[] {
	const scripts = selectAll('script[type="application/ld+json"]', doc) as unknown as Element[];
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

export function findByType(items: unknown[], type: string): Record<string, unknown> | null {
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

export function stringVal(v: unknown): string | null {
	return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Convert schema.org ItemAvailability / ItemCondition URL to human text */
function schemaUrlToText(url: string): string {
	const last = url.split("/").pop() ?? url;
	return last
		.replace(/Condition$/, "")
		.replace(/([A-Z])/g, " $1")
		.trim();
}

/** Extract availability text from a schema.org URL, or pass through plain text */
function availabilityText(raw: string): string {
	if (raw.startsWith("http")) return schemaUrlToText(raw);
	return raw;
}

// ── Shared offer extraction ────────────────────────────────────────────────

interface OfferFields {
	price: string | null;
	currency: string | null;
	availability: string | null;
	condition: string | null;
}

function extractOffers(product: Record<string, unknown>): OfferFields {
	let price: string | null = null;
	let currency: string | null = null;
	let availability: string | null = null;
	let condition: string | null = null;

	const offersRaw = product.offers;
	const offers = Array.isArray(offersRaw) ? (offersRaw as unknown[]) : offersRaw ? [offersRaw] : [];

	for (const offer of offers) {
		const o = offer as Record<string, unknown>;
		// Handle both single price (o.price) and range prices (o.lowPrice / o.highPrice)
		const priceVal = o.price ?? o.lowPrice;
		if (priceVal !== undefined && priceVal !== null) {
			price = String(priceVal);
		}
		currency = stringVal(o.priceCurrency);
		const avail = stringVal(o.availability);
		if (avail) availability = availabilityText(avail);
		const cond = stringVal(o.itemCondition);
		if (cond) condition = schemaUrlToText(cond);
		break; // use first offer only
	}

	return { price, currency, availability, condition };
}

// ── Shared rating extraction ───────────────────────────────────────────────

interface RatingFields {
	rating: string | null;
	reviewCount: string | null;
}

function extractRating(product: Record<string, unknown>): RatingFields {
	const ratingObj = product.aggregateRating as Record<string, unknown> | undefined;
	if (!ratingObj) return { rating: null, reviewCount: null };

	const val = ratingObj.ratingValue;
	const count = ratingObj.reviewCount ?? ratingObj.ratingCount;
	return {
		rating: val !== undefined ? String(val) : null,
		reviewCount: count !== undefined ? String(count) : null,
	};
}

// ── parseGenericProduct ────────────────────────────────────────────────────

/**
 * Base product parser that covers JSON-LD + universal itemprop/og: fallbacks.
 * Returns a ProductData object — callers may augment fields before returning.
 */
export function parseGenericProduct(
	html: string,
	url: string,
	platform: "walmart" | "target" | "etsy",
): ProductData {
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

	// ── 1. JSON-LD Product (most stable source) ──────────────────────────
	const jsonLdItems = extractJsonLd(doc);
	const product = findByType(jsonLdItems, "Product");

	let jsonLdDescription: string | null = null;

	if (product) {
		name = stringVal(product.name);

		const brandRaw = product.brand;
		if (brandRaw && typeof brandRaw === "object") {
			brand = stringVal((brandRaw as Record<string, unknown>).name);
		} else {
			brand = stringVal(brandRaw);
		}

		sku = stringVal(product.sku) ?? stringVal(product.productID);

		// Product.description from JSON-LD (e.g. Etsy embeds full description here)
		jsonLdDescription = stringVal(product.description);

		const offerFields = extractOffers(product);
		price = offerFields.price;
		currency = offerFields.currency;
		availability = offerFields.availability;
		condition = offerFields.condition;

		const ratingFields = extractRating(product);
		rating = ratingFields.rating;
		reviewCount = ratingFields.reviewCount;
	}

	// ── 2. itemprop fallbacks ────────────────────────────────────────────
	if (!name) {
		// itemprop="name" on an h1 is most reliable; fall back to any element
		name = getText('h1[itemprop="name"]', doc) ?? getText('[itemprop="name"]', doc);
	}

	if (!price) {
		const priceEl = selectOne('[itemprop="price"]', doc) as Element | null;
		if (priceEl) {
			// Prefer content attr (schema.org pattern), then text
			price =
				(getAttributeValue(priceEl, "content") ?? null) || textContent(priceEl).trim() || null;
		}
	}

	if (!currency) {
		const currEl = selectOne('[itemprop="priceCurrency"]', doc) as Element | null;
		if (currEl) {
			currency =
				(getAttributeValue(currEl, "content") ?? null) || textContent(currEl).trim() || null;
		}
	}

	// ── 3. og: meta fallbacks ────────────────────────────────────────────
	if (!name) {
		name = getMeta(doc, "og:title");
	}

	// Description: JSON-LD > itemprop="description" > og:description
	// JSON-LD Product.description is the most structured source (e.g. Etsy uses it)
	let description: string | null = jsonLdDescription ?? getMeta(doc, "og:description");

	// itemprop="description" microdata overrides og: but not JSON-LD
	if (!jsonLdDescription) {
		const descItempropEl = selectOne('[itemprop="description"]', doc) as Element | null;
		if (descItempropEl) {
			const md = renderMarkdown(descItempropEl);
			if (md) description = md;
		}
	}

	// Guard: require at least a name or price
	if (!name && !price) {
		throw new Error(`No ${platform} product content found`);
	}

	return {
		type: "product",
		title: name || pageTitle,
		url,
		platform,
		name,
		brand,
		sku,
		price,
		currency,
		availability,
		condition,
		rating,
		reviewCount,
		features: [],
		specifications: [],
		description,
	};
}
