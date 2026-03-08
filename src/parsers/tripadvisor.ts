/**
 * tripadvisor.ts — Parser for TripAdvisor attraction, hotel, and restaurant pages.
 *
 * URL patterns handled:
 *   Attraction:  /Attraction_Review-g<geo>-d<id>-Reviews-<slug>.html
 *   Hotel:       /Hotel_Review-g<geo>-d<id>-Reviews-<slug>.html
 *   Restaurant:  /Restaurant_Review-g<geo>-d<id>-Reviews-<slug>.html
 *
 * Extraction priority: JSON-LD (LodgingBusiness, Restaurant, TouristAttraction, LocalBusiness)
 *   → og:* meta tags → DOM selectors.
 *
 * TripAdvisor embeds JSON-LD with @type LodgingBusiness (hotels), Restaurant,
 * or TouristAttraction, including aggregateRating, address, priceRange, and image.
 * Reviews and amenities are supplemented from DOM selectors.
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { BusinessData, BusinessReview } from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	if (el) return getAttributeValue(el, "content") ?? null;
	const named = selectOne(`meta[name="${property}"]`, doc) as Element | null;
	return named ? (getAttributeValue(named, "content") ?? null) : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

function normalizeText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function extractJsonLd(doc: Document): unknown[] {
	const scripts = selectAll('script[type="application/ld+json"]', doc) as unknown as Element[];
	const results: unknown[] = [];
	for (const script of scripts) {
		const raw = textContent(script).trim();
		if (!raw) continue;
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				results.push(...parsed);
			} else {
				results.push(parsed);
			}
		} catch {
			// Ignore malformed JSON-LD
		}
	}
	return results;
}

// ── JSON-LD type matching ────────────────────────────────────────────────────

const BUSINESS_TYPES = new Set([
	// Hotels / lodging
	"LodgingBusiness",
	"Hotel",
	"Hostel",
	"BedAndBreakfast",
	"Motel",
	"Resort",
	// Restaurants / food
	"Restaurant",
	"FoodEstablishment",
	"BarOrPub",
	"CafeOrCoffeeShop",
	"Bakery",
	"FastFoodRestaurant",
	// Attractions
	"TouristAttraction",
	"LandmarksOrHistoricalBuildings",
	"Museum",
	"AmusementPark",
	"Zoo",
	"Aquarium",
	"Park",
	// Generic local business
	"LocalBusiness",
]);

function isBusinessType(type: unknown): boolean {
	if (typeof type === "string") return BUSINESS_TYPES.has(type);
	if (Array.isArray(type)) return (type as string[]).some((t) => BUSINESS_TYPES.has(t));
	return false;
}

// ── JSON-LD extraction ──────────────────────────────────────────────────────

function extractFromJsonLd(jsonLdItems: unknown[]): Partial<BusinessData> & { found: boolean } {
	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		if (!isBusinessType(obj["@type"])) continue;

		const name = typeof obj.name === "string" ? obj.name : null;

		// Address
		let address: string | null = null;
		const addr = obj.address as Record<string, unknown> | undefined;
		if (addr) {
			const parts = [
				typeof addr.streetAddress === "string" ? addr.streetAddress : "",
				typeof addr.addressLocality === "string" ? addr.addressLocality : "",
				typeof addr.addressRegion === "string" ? addr.addressRegion : "",
				typeof addr.postalCode === "string" ? addr.postalCode : "",
			].filter(Boolean);
			// Handle addressCountry which can be a string or { @type: "Country", name: "..." }
			const country = addr.addressCountry;
			if (typeof country === "string") {
				parts.push(country);
			} else if (country && typeof (country as Record<string, unknown>).name === "string") {
				parts.push((country as Record<string, unknown>).name as string);
			}
			address = parts.length > 0 ? parts.join(", ") : null;
		}

		// Rating
		const ratingObj = obj.aggregateRating as Record<string, unknown> | undefined;
		const rating = ratingObj ? String(ratingObj.ratingValue ?? "") || null : null;
		const reviewCount = ratingObj ? String(ratingObj.reviewCount ?? "") || null : null;

		// Phone
		const phone = typeof obj.telephone === "string" ? obj.telephone : null;

		// Price range
		const priceRange = typeof obj.priceRange === "string" ? obj.priceRange : null;

		// Categories from servesCuisine (restaurants) or additionalType
		const categories: string[] = [];
		if (Array.isArray(obj.servesCuisine)) {
			for (const c of obj.servesCuisine) {
				if (typeof c === "string") categories.push(c);
			}
		} else if (typeof obj.servesCuisine === "string") {
			categories.push(obj.servesCuisine);
		}

		// Hours from openingHoursSpecification
		const hours: { day: string; time: string }[] = [];
		if (Array.isArray(obj.openingHoursSpecification)) {
			for (const spec of obj.openingHoursSpecification as Record<string, unknown>[]) {
				const days = Array.isArray(spec.dayOfWeek)
					? (spec.dayOfWeek as string[])
					: typeof spec.dayOfWeek === "string"
						? [spec.dayOfWeek]
						: [];
				const opens = typeof spec.opens === "string" ? spec.opens : "";
				const closes = typeof spec.closes === "string" ? spec.closes : "";
				if (days.length > 0 && (opens || closes)) {
					for (const day of days) {
						hours.push({ day, time: `${opens} - ${closes}` });
					}
				}
			}
		}

		// Reviews from JSON-LD
		const reviews: BusinessReview[] = [];
		const reviewItems = Array.isArray(obj.review) ? obj.review : [];
		for (const rev of reviewItems as Record<string, unknown>[]) {
			const authorObj = rev.author as Record<string, unknown> | undefined;
			const authorName = authorObj && typeof authorObj.name === "string" ? authorObj.name : null;
			const ratingVal = rev.reviewRating as Record<string, unknown> | undefined;
			const reviewRating = ratingVal ? String(ratingVal.ratingValue ?? "") || null : null;
			const date = typeof rev.datePublished === "string" ? rev.datePublished : null;
			const body = typeof rev.reviewBody === "string" ? rev.reviewBody : "";
			if (body) {
				reviews.push({ author: authorName, rating: reviewRating, date, body });
			}
		}

		// Website (external, not TripAdvisor's own URL)
		let website: string | null = null;
		if (typeof obj.url === "string" && !obj.url.includes("tripadvisor.")) {
			website = obj.url;
		}

		// Description
		const description = typeof obj.description === "string" ? obj.description : null;

		return {
			found: true,
			name,
			address,
			rating,
			reviewCount,
			phone,
			priceRange,
			categories,
			hours,
			reviews,
			website,
			description,
		};
	}

	return { found: false };
}

// ── DOM fallback extraction ─────────────────────────────────────────────────

function extractCategoriesFromDom(doc: Document): string[] {
	const categories: string[] = [];
	const seen = new Set<string>();

	// TripAdvisor shows categories/tags near the header
	const tagLinks = selectAll('a[href*="/Restaurants-"]', doc) as unknown as Element[];
	for (const link of tagLinks) {
		const text = textContent(link).trim();
		if (text && text.length > 1 && text.length < 60 && !seen.has(text)) {
			seen.add(text);
			categories.push(text);
		}
	}

	return categories;
}

function extractAmenitiesFromDom(doc: Document): string[] {
	const amenities: string[] = [];
	const seen = new Set<string>();

	// TripAdvisor uses data-test-target="amenity" for amenity items
	const amenityEls = selectAll("[data-test-target='amenity']", doc) as unknown as Element[];
	for (const el of amenityEls) {
		const text = textContent(el).trim();
		if (text && text.length > 1 && !seen.has(text)) {
			seen.add(text);
			amenities.push(text);
		}
	}

	// Fallback: look for amenities in a section headed by "Amenities"
	if (amenities.length === 0) {
		const headings = selectAll("h3", doc) as unknown as Element[];
		for (const heading of headings) {
			const headingText = textContent(heading).trim().toLowerCase();
			if (headingText === "amenities" || headingText === "property amenities" || headingText === "room features") {
				// Get the next sibling container and extract list items
				const parent = heading.parent as Element | null;
				if (parent) {
					const items = selectAll("li", parent) as unknown as Element[];
					for (const item of items) {
						const text = textContent(item).trim();
						if (text && text.length > 1 && text.length < 100 && !seen.has(text)) {
							seen.add(text);
							amenities.push(text);
						}
					}
				}
			}
		}
	}

	return amenities;
}

function extractSectionText(doc: Document, heading: string): string | null {
	const headings = selectAll("h1, h2, h3, h4", doc) as unknown as Element[];
	for (const el of headings) {
		const text = normalizeText(textContent(el));
		if (text !== heading) continue;
		let parent = el.parent as Element | null;
		for (let depth = 0; depth < 3 && parent; depth += 1, parent = parent.parent as Element | null) {
			const sectionText = normalizeText(textContent(parent));
			if (sectionText.length > heading.length + 20) return sectionText;
		}
	}
	return null;
}

function extractAmenitiesFromSection(sectionText: string | null): string[] {
	if (!sectionText) return [];
	const match = sectionText.match(/Property amenities(.*?)(?:Room features|Room types|Good to know|Hotel links|Languages Spoken|Location)/i);
	if (!match?.[1]) return [];

	return match[1]
		.split(/Show more/i)[0]
		.split(/(?=[A-Z][a-z])/)
		.map((item) => normalizeText(item))
		.filter((item) => item.length > 2 && item.length < 120);
}

function extractReviewsFromDom(doc: Document): BusinessReview[] {
	const reviews: BusinessReview[] = [];

	// TripAdvisor uses data-reviewid on review containers
	const reviewEls = selectAll("[data-reviewid]", doc) as unknown as Element[];
	for (const reviewEl of reviewEls) {
		// Get review text — look for a quote element or paragraph
		const quoteEl = selectOne("q", reviewEl) as Element | null;
		const bodyEl = quoteEl ?? (selectOne("p", reviewEl) as Element | null);
		const body = bodyEl ? textContent(bodyEl).trim() : "";
		if (!body) continue;

		// Get rating from aria-label or title with "bubble" rating
		let reviewRating: string | null = null;
		const bubbleEl = selectOne("[aria-label*='bubble']", reviewEl) as Element | null;
		if (bubbleEl) {
			const ariaLabel = getAttributeValue(bubbleEl, "aria-label") ?? "";
			const ratingMatch = ariaLabel.match(/(\d+(?:\.\d+)?)\s*of\s*\d+\s*bubble/i);
			if (ratingMatch) reviewRating = ratingMatch[1] ?? null;
		}

		// Get author name
		let author: string | null = null;
		const authorLink = selectOne("a[href*='/Profile/']", reviewEl) as Element | null;
		if (authorLink) {
			author = textContent(authorLink).trim() || null;
		}

		// Get date
		let date: string | null = null;
		const dateEl = selectOne("[data-test-target='review-date']", reviewEl) as Element | null;
		if (dateEl) {
			const dateText = textContent(dateEl).trim();
			// TripAdvisor dates look like "Written December 15, 2024" or "Dec 2024"
			const cleaned = dateText.replace(/^Written\s+/i, "").trim();
			date = cleaned || null;
		}

		reviews.push({ author, rating: reviewRating, date, body });
	}

	return reviews;
}

function extractPhotoCount(doc: Document): string | null {
	// Look for "See all X photos" or similar text
	const spans = selectAll("span", doc) as unknown as Element[];
	for (const span of spans) {
		const text = textContent(span).trim();
		const match = text.match(/(?:See\s+all\s+)?([\d,]+)\s+photos?/i);
		if (match) {
			return match[1]?.replace(/,/g, "") ?? null;
		}
	}
	const metaDesc = getMeta(doc, "description");
	const metaMatch = metaDesc?.match(/([\d,]+)\s+candid photos/i);
	if (metaMatch?.[1]) return metaMatch[1].replace(/,/g, "");
	return null;
}

function extractHoursFromDom(doc: Document): { day: string; time: string }[] {
	const hours: { day: string; time: string }[] = [];

	// Look for hours section
	const hoursEls = selectAll("[data-test-target='hours-section']", doc) as unknown as Element[];
	if (hoursEls.length > 0) {
		for (const hoursEl of hoursEls) {
			const rows = selectAll("tr", hoursEl) as unknown as Element[];
			for (const row of rows) {
				const th = selectOne("th", row) as Element | null;
				const td = selectOne("td", row) as Element | null;
				if (th && td) {
					const day = textContent(th).trim();
					const time = textContent(td).trim();
					if (day && time) hours.push({ day, time });
				}
			}
		}
	}

	return hours;
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseTripAdvisor(html: string, url: string): BusinessData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");

	// 1. Try JSON-LD first (primary data source)
	const jsonLdItems = extractJsonLd(doc);
	const jsonLd = extractFromJsonLd(jsonLdItems);

	// 2. Extract data from DOM as fallback/supplement
	const domCategories = extractCategoriesFromDom(doc);
	const domAmenities = extractAmenitiesFromDom(doc);
	const domReviews = extractReviewsFromDom(doc);
	const domPhotoCount = extractPhotoCount(doc);
	const domHours = extractHoursFromDom(doc);
	const aboutSection = extractSectionText(doc, "About");
	const locationSection = extractSectionText(doc, "Location");

	// 3. Merge JSON-LD with DOM fallbacks
	const name = jsonLd.name ?? getText("h1", doc) ?? ogTitle ?? null;

	const address =
		jsonLd.address ??
		getText("[data-test-target='address']", doc) ??
		null;

	const phone =
		jsonLd.phone ??
		getText("[data-test-target='phone']", doc) ??
		locationSection?.match(/\+\d[\d\s().-]{7,}\d/)?.[0] ??
		null;

	const website =
		jsonLd.website ??
		getAttr('a[href*="Commerce?p="]', "href", doc) ??
		null;

	const description =
		jsonLd.description ??
		aboutSection?.match(/(?:Sleep Quality[\d.]+)?(Located in .*?)(?:Read more|Property amenities)/i)?.[1]?.trim() ??
		ogDesc ??
		null;

	const priceRange =
		jsonLd.priceRange ??
		getText("[data-test-target='price-range']", doc) ??
		null;

	const categories = (jsonLd.categories && jsonLd.categories.length > 0) ? jsonLd.categories : domCategories;
	const hours = (jsonLd.hours && jsonLd.hours.length > 0) ? jsonLd.hours : domHours;
	const reviews = (jsonLd.reviews && jsonLd.reviews.length > 0) ? jsonLd.reviews : domReviews;
	const amenities = domAmenities.length > 0 ? domAmenities : extractAmenitiesFromSection(aboutSection);

	if (!name && !description && !ogTitle && !pageTitle) {
		throw new Error("No TripAdvisor content found");
	}

	// Clean up title — remove " - Tripadvisor" suffix
	const title = (name ?? ogTitle ?? pageTitle ?? "")
		.replace(/\s*[-|]\s*Tripadvisor$/i, "")
		.replace(/\s*[-|]\s*TripAdvisor$/i, "")
		.trim() || null;

	return {
		type: "business",
		title,
		url,
		name,
		rating: jsonLd.rating ?? null,
		reviewCount: jsonLd.reviewCount ?? null,
		priceRange,
		categories,
		address,
		phone,
		website,
		hours,
		amenities,
		photoCount: domPhotoCount,
		description,
		reviews,
	};
}
