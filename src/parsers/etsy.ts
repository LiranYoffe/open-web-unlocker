/**
 * etsy.ts — Etsy product (listing) page parser.
 *
 * Strategy:
 *   1. parseGenericProduct() handles JSON-LD Product + universal itemprop/og: fallbacks.
 *   2. Etsy embeds full product data in JSON-LD: name, description, sku (listing ID),
 *      brand (shop name), aggregateRating, offers.{lowPrice,highPrice,priceCurrency}.
 *      This covers most fields without DOM parsing.
 *   3. This wrapper provides DOM fallbacks and URL-derived SKU for cases where
 *      JSON-LD is absent (e.g., Etsy is protected by DataDome anti-bot on fetch).
 *
 * JSON-LD Product structure (confirmed from Etsy pages):
 *   - name: listing title
 *   - sku: listing ID (e.g., "949905096")
 *   - description: full item description
 *   - brand.name: shop/seller name
 *   - offers.lowPrice / offers.highPrice + offers.priceCurrency
 *   - aggregateRating.ratingValue + aggregateRating.reviewCount
 *
 * Selector priority: JSON-LD → og: meta → [data-buy-box-listing-title] → h1
 * Never use: [class*=...] substring class selectors
 */

import { selectOne } from "css-select";
import type { Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { getMeta, parseGenericProduct, renderMarkdown } from "./generic-product";
import type { ProductData } from "./page-data";

/** Extract the numeric listing ID from an Etsy URL, e.g. /listing/123456789/... */
function extractListingId(url: string): string | null {
	const match = /\/listing\/(\d+)/.exec(url);
	return match?.[1] ?? null;
}

export function parseEtsy(html: string, url: string): ProductData {
	// Base parse: JSON-LD + itemprop + og: fallbacks
	// JSON-LD on Etsy covers: name, description, sku, brand, aggregateRating, offers.lowPrice
	const result = parseGenericProduct(html, url, "etsy");

	// Parse the document again for DOM augmentation
	const doc = parseDocument(html);

	// ── SKU: use URL-derived listing ID when JSON-LD productID is absent ──
	// Etsy's JSON-LD sets sku = listing ID, but fallback to URL if missing
	if (!result.sku) {
		result.sku = extractListingId(url);
	}

	// ── Name fallbacks (DOM) ───────────────────────────────────────────────
	if (!result.name) {
		// Etsy uses data-buy-box-listing-title attribute on their h1
		const h1ByAttr = selectOne("h1[data-buy-box-listing-title]", doc) as Element | null;
		const h1Plain = selectOne("h1", doc) as Element | null;
		const nameEl = h1ByAttr ?? h1Plain;
		if (nameEl) {
			result.name = textContent(nameEl).trim() || null;
			if (!result.title) result.title = result.name;
		}
	}

	// ── Price fallbacks (DOM) ──────────────────────────────────────────────
	if (!result.price) {
		// data-buy-box-listing-price attribute on a container
		const priceByAttr = selectOne("[data-buy-box-listing-price]", doc) as Element | null;
		// itemprop="price" (schema.org microdata pattern)
		const priceByItemprop = selectOne('[itemprop="price"]', doc) as Element | null;

		const priceEl = priceByAttr ?? priceByItemprop;
		if (priceEl) {
			// Prefer content attribute (schema.org), then text with symbols stripped
			const raw =
				(getAttributeValue(priceEl, "content") ?? null) ||
				textContent(priceEl)
					.replace(/[^0-9.]/g, "")
					.trim();
			result.price = raw || null;
		}
	}

	// ── Brand (seller/shop name) fallbacks ─────────────────────────────────
	// JSON-LD brand.name should cover this; DOM fallback for edge cases
	if (!result.brand) {
		// itemprop="brand" microdata (some Etsy pages)
		const brandEl = selectOne('[itemprop="brand"]', doc) as Element | null;
		if (brandEl) {
			result.brand =
				(getAttributeValue(brandEl, "content") ?? null) || textContent(brandEl).trim() || null;
		}
	}

	// ── Description (DOM fallbacks) ────────────────────────────────────────
	// JSON-LD description should be available; DOM fallback for legacy/variant pages
	if (!result.description) {
		// Etsy's long description toggle div (legacy selector)
		const descById = selectOne("div#wt-content-toggle-description-long", doc) as Element | null;
		// Etsy's listing page description via data-testid (current selector)
		const descByTestId = selectOne(
			'[data-testid="listing-page-description"]',
			doc,
		) as Element | null;

		const descEl = descById ?? descByTestId;
		if (descEl) {
			result.description = renderMarkdown(descEl);
		}
	}

	// Fallback to og:description
	if (!result.description) {
		result.description = getMeta(doc, "og:description");
	}

	// Final guard
	if (!result.name && !result.price && !result.description) {
		throw new Error("No Etsy listing content found");
	}

	return result;
}
