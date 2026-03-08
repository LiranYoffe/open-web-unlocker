/**
 * booking-search.ts — Parser for Booking.com search/listing pages.
 *
 * URL patterns handled:
 *   /searchresults.html?ss=<destination>
 *   /searchresults.html?ss=<destination>&checkin=...&checkout=...
 *
 * Extraction priority: DOM selectors (data-testid attributes).
 * No JSON-LD is present on search result pages.
 *
 * Each property card uses consistent data-testid selectors:
 *   - property-card (container)
 *   - title / title-link (name + URL)
 *   - rating-stars / rating-squares (star count via aria-label on parent)
 *   - review-score (score, label, review count)
 *   - address-text (neighborhood / location)
 *   - distance (distance from downtown)
 *   - secondary-review-score-link (location score via aria-label)
 *   - image (property image)
 *
 * Prices are NOT present in the server-rendered HTML — Booking.com hides
 * them behind a "Show prices" button that triggers a client-side fetch.
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { LodgingSearchData, LodgingSearchProperty } from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

/**
 * Extract the star count from the parent container's aria-label.
 * Booking.com uses a div with role="button" and aria-label="N out of 5"
 * wrapping either data-testid="rating-stars" or "rating-squares".
 */
function extractStars(card: Element): number | null {
	// Find the parent div with aria-label containing "out of" for either rating type
	const ratingStars = selectOne('[data-testid="rating-stars"]', card) as Element | null;
	const ratingSquares = selectOne('[data-testid="rating-squares"]', card) as Element | null;
	const ratingEl = ratingStars ?? ratingSquares;
	if (!ratingEl) return null;

	// Walk up to the parent with aria-label
	let parent = ratingEl.parent as Element | null;
	while (parent) {
		const ariaLabel = getAttributeValue(parent, "aria-label");
		if (ariaLabel) {
			const match = ariaLabel.match(/(\d+)\s*out\s*of\s*(\d+)/i);
			if (match) return Number.parseInt(match[1] as string, 10);
		}
		parent = parent.parent as Element | null;
	}

	return null;
}

/**
 * Extract review score, label, and count from the review-score container.
 * Structure: "Scored 8.9" (sr-only) | "8.9" (visible) | "Excellent" | "1,203 reviews"
 */
function extractReviewInfo(card: Element): {
	rating: string | null;
	ratingLabel: string | null;
	reviewCount: string | null;
} {
	const reviewScoreEl = selectOne('[data-testid="review-score"]', card) as Element | null;
	if (!reviewScoreEl) return { rating: null, ratingLabel: null, reviewCount: null };

	const fullText = textContent(reviewScoreEl).trim();

	// Extract numeric score — "Scored 8.9 8.9 Excellent 1,203 reviews"
	const scoreMatch = fullText.match(/Scored\s+([\d.]+)/);
	const rating = scoreMatch ? (scoreMatch[1] ?? null) : null;

	// Extract label (Wonderful, Excellent, Very Good, etc.)
	const labelMatch = fullText.match(
		/(?:Wonderful|Excellent|Very Good|Good|Superb|Exceptional|Fabulous|Pleasant|Review score)/i,
	);
	const ratingLabel = labelMatch ? labelMatch[0] : null;

	// Extract review count
	const countMatch = fullText.match(/([\d,]+)\s+reviews?/);
	const reviewCount = countMatch ? (countMatch[1] ?? null) : null;

	return { rating, ratingLabel, reviewCount };
}

/**
 * Extract clean property URL from the title-link anchor.
 * Strips tracking query parameters, keeping only the path.
 */
function extractPropertyUrl(card: Element): string | null {
	const linkEl = selectOne('[data-testid="title-link"]', card) as Element | null;
	if (!linkEl) return null;

	const href = getAttributeValue(linkEl, "href");
	if (!href) return null;

	// Clean URL: strip query params (tracking)
	try {
		const parsed = new URL(href.replace(/&amp;/g, "&"), "https://www.booking.com");
		return `${parsed.origin}${parsed.pathname}`;
	} catch {
		// Fallback: strip after ?
		const clean = href.split("?")[0];
		return clean || null;
	}
}

/**
 * Extract location score from the secondary-review-score-link aria-label.
 * Format: "Location: Scored 9.7"
 */
function extractLocationScore(card: Element): string | null {
	const el = selectOne('[data-testid="secondary-review-score-link"]', card) as Element | null;
	if (!el) return null;

	const ariaLabel = getAttributeValue(el, "aria-label");
	if (!ariaLabel) return null;

	const match = ariaLabel.match(/Location:\s*Scored\s*([\d.]+)/i);
	return match ? (match[1] ?? null) : null;
}

/**
 * Extract the property image URL from the data-testid="image" element.
 */
function extractImageUrl(card: Element): string | null {
	const imgEl = selectOne('[data-testid="image"]', card) as Element | null;
	if (!imgEl) return null;
	return getAttributeValue(imgEl, "src") ?? null;
}

/**
 * Extract destination and total result count from the H1 heading.
 * Format: "Paris: 12,333 properties found"
 */
function extractPageMeta(doc: Document): {
	destination: string | null;
	totalResults: string | null;
} {
	const h1 = getText("h1", doc);
	if (!h1) return { destination: null, totalResults: null };

	// Try "Destination: N properties found"
	const match = h1.match(/^(.+?):\s*([\d,]+)\s+properties?\s+found$/i);
	if (match) {
		return {
			destination: (match[1] ?? "").trim() || null,
			totalResults: (match[2] ?? "").replace(/,/g, "") || null,
		};
	}

	// Fallback — just treat the whole H1 as destination context
	return { destination: h1, totalResults: null };
}

function parseOptionalInt(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function extractSearchState(html: string, url: string): {
	checkIn: string | null;
	checkOut: string | null;
	adults: number | null;
	children: number | null;
	rooms: number | null;
} {
	const parsedUrl = new URL(url);
	const adultsFromUrl =
		parseOptionalInt(parsedUrl.searchParams.get("group_adults")) ??
		parseOptionalInt(parsedUrl.searchParams.get("adults"));
	const childrenFromUrl =
		parseOptionalInt(parsedUrl.searchParams.get("group_children")) ??
		parseOptionalInt(parsedUrl.searchParams.get("children"));
	const roomsFromUrl =
		parseOptionalInt(parsedUrl.searchParams.get("no_rooms")) ??
		parseOptionalInt(parsedUrl.searchParams.get("rooms"));

	const adultsFromHtml = parseOptionalInt(html.match(/"b_adults_total":\s*(\d+)/)?.[1] ?? null);
	const childrenFromHtml = parseOptionalInt(html.match(/"b_children_total":\s*(\d+)/)?.[1] ?? null);
	const roomsFromHtml = parseOptionalInt(html.match(/"b_nr_rooms_needed":\s*(\d+)/)?.[1] ?? null);

	return {
		checkIn: parsedUrl.searchParams.get("checkin"),
		checkOut: parsedUrl.searchParams.get("checkout"),
		adults: adultsFromUrl ?? adultsFromHtml,
		children: childrenFromUrl ?? childrenFromHtml,
		rooms: roomsFromUrl ?? roomsFromHtml,
	};
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseBookingSearch(html: string, url: string): LodgingSearchData {
	const doc = parseDocument(html);

	// Page-level metadata
	const { destination, totalResults } = extractPageMeta(doc);
	const searchState = extractSearchState(html, url);
	const titleEl = selectOne("title", doc) as Element | null;
	const pageTitle = titleEl ? textContent(titleEl).trim() || null : null;

	// Extract all property cards using per-container pattern
	const cards = selectAll('[data-testid="property-card"]', doc) as unknown as Element[];
	const properties: LodgingSearchProperty[] = [];

	for (const card of cards) {
		// Name from title element
		const name = getText('[data-testid="title"]', card);
		if (!name) continue; // Skip cards without a name (ads, banners)

		// URL
		const propertyUrl = extractPropertyUrl(card);

		// Star rating
		const stars = extractStars(card);

		// Review info
		const { rating, ratingLabel, reviewCount } = extractReviewInfo(card);

		// Location / address
		const location = getText('[data-testid="address-text"]', card);

		// Distance from downtown
		const distance = getText('[data-testid="distance"]', card);

		// Location score
		const locationScore = extractLocationScore(card);

		// Description snippet — Booking.com renders these in a div with class fff1944c52
		// but since class-based selectors are fragile, we look for the description text
		// after the address/distance section. We use a structural approach.
		let description: string | null = null;
		// The description is in a direct child div of the main content area.
		// It's typically the last text-heavy div before the review/price section.
		// We find it by looking for substantial text (>50 chars) that isn't the title or address.
		const allDivs = selectAll("div", card) as unknown as Element[];
		for (const div of allDivs) {
			// Skip if this div has data-testid (it's a structural element)
			if (getAttributeValue(div, "data-testid")) continue;
			// Skip if it has child elements that are divs/spans with data-testid
			if (selectOne("[data-testid]", div)) continue;

			const text = textContent(div).trim();
			if (
				text.length > 50 &&
				text !== name &&
				!text.includes("Scored") &&
				!text.includes("reviews") &&
				!text.includes("Show prices") &&
				!text.includes("Opens in new window")
			) {
				description = text;
				break;
			}
		}

		// Image URL
		const imageUrl = extractImageUrl(card);

		properties.push({
			name,
			url: propertyUrl,
			stars,
			rating,
			ratingLabel,
			reviewCount,
			location,
			distance,
			locationScore,
			description,
			imageUrl,
		});
	}

	if (properties.length === 0) {
		throw new Error("No Booking.com search results found");
	}

	return {
		type: "lodging-search",
		title: destination
			? `${destination} — ${properties.length} properties`
			: pageTitle,
		url,
		destination,
		totalResults,
		checkIn: searchState.checkIn,
		checkOut: searchState.checkOut,
		adults: searchState.adults,
		children: searchState.children,
		rooms: searchState.rooms,
		properties,
	};
}
