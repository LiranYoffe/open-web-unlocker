/**
 * airbnb.ts — Parser for Airbnb property listing pages.
 *
 * URL patterns handled:
 *   /rooms/<id>  — individual listing page
 *
 * Airbnb is a Next.js app but serves SSR HTML with rich embedded data:
 *   1. JSON-LD: VacationRental + Product schemas (name, description, images, rating, occupancy, coordinates)
 *   2. niobeClientData: Embedded GraphQL response with full PDP sections
 *      (title, description, amenities, host, reviews, location, highlights, house rules, photos)
 *   3. Meta tags: og:title, og:description, og:image, description
 *
 * Airbnb no longer serves rich SSR HTML to plain fetches — niobeClientData is
 * often absent. Browser rendering is the primary strategy. The parser has
 * DOM fallbacks for browser-rendered pages plus niobeClientData/JSON-LD extraction.
 *
 * Note: Some listing IDs return a static 404 page (delisted properties).
 * The parser detects this and throws.
 *
 * Returns LodgingData with extended optional fields for Airbnb-specific data
 * (host info, propertyType, guests, images, categoryRatings, highlights,
 * houseRules, location coordinates, price, etc.).
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { LodgingData } from "./page-data";

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

// ── Types for internal use ──────────────────────────────────────────────────

interface NiobeSection {
	section?: Record<string, unknown> | null;
	loggingData?: Record<string, unknown>;
	sectionData?: Record<string, unknown>;
	sectionId?: string;
}

interface NiobeSbuiSection {
	sectionId?: string;
	sectionData?: Record<string, unknown>;
}

interface AirbnbExtracted {
	name: string | null;
	description: string | null;
	address: string | null;
	rating: string | null;
	reviewCount: string | null;
	amenities: string[];
	// Extended fields (available from niobeClientData / JSON-LD)
	price: string | null;
	propertyType: string | null;
	guests: string | null;
	bedrooms: string | null;
	beds: string | null;
	bathrooms: string | null;
	hostName: string | null;
	hostIsSuperhost: boolean;
	hostYearsHosting: string | null;
	hostAbout: string | null;
	hostResponseRate: string | null;
	highlights: string[];
	houseRules: string[];
	safetyItems: string[];
	categoryRatings: { category: string; rating: string }[];
	locationSubtitle: string | null;
	neighborhoodHighlights: string | null;
	images: string[];
	latitude: number | null;
	longitude: number | null;
	listingId: string | null;
}

// ── niobeClientData extraction ──────────────────────────────────────────────

/**
 * Extract the niobeClientData JSON from the page's inline scripts.
 * Airbnb embeds a large JSON object containing GraphQL PDP section data
 * inside a <script> tag (no id/type attribute — identified by content).
 */
function extractNiobeData(doc: Document): NiobeSection[] | null {
	const scripts = selectAll("script", doc) as unknown as Element[];
	for (const script of scripts) {
		// Skip scripts with src, type=ld+json, etc.
		const src = getAttributeValue(script, "src");
		if (src) continue;
		const type = getAttributeValue(script, "type");
		if (type === "application/ld+json") continue;

		const raw = textContent(script).trim();
		if (!raw.startsWith('{"niobeClientData"')) continue;

		try {
			const parsed = JSON.parse(raw) as { niobeClientData?: unknown[][] };
			const niobe = parsed.niobeClientData;
			if (!Array.isArray(niobe) || niobe.length === 0) continue;

			const entry = niobe[0];
			if (!Array.isArray(entry) || entry.length < 2) continue;

			const payload = entry[1] as Record<string, unknown>;
			const data = payload?.data as Record<string, unknown>;
			const presentation = data?.presentation as Record<string, unknown>;
			const pdp = presentation?.stayProductDetailPage as Record<string, unknown>;
			const sectionsContainer = pdp?.sections as Record<string, unknown>;
			const sections = sectionsContainer?.sections as NiobeSection[] | undefined;

			return sections ?? null;
		} catch {
			// Not the right script
		}
	}
	return null;
}

/**
 * Extract sbuiData sections (overview, host overview) from the niobeClientData.
 */
function extractSbuiSections(doc: Document): NiobeSbuiSection[] {
	const scripts = selectAll("script", doc) as unknown as Element[];
	for (const script of scripts) {
		const src = getAttributeValue(script, "src");
		if (src) continue;
		const type = getAttributeValue(script, "type");
		if (type === "application/ld+json") continue;

		const raw = textContent(script).trim();
		if (!raw.startsWith('{"niobeClientData"')) continue;

		try {
			const parsed = JSON.parse(raw) as { niobeClientData?: unknown[][] };
			const niobe = parsed.niobeClientData;
			if (!Array.isArray(niobe) || niobe.length === 0) continue;

			const entry = niobe[0];
			if (!Array.isArray(entry) || entry.length < 2) continue;

			const payload = entry[1] as Record<string, unknown>;
			const data = payload?.data as Record<string, unknown>;
			const presentation = data?.presentation as Record<string, unknown>;
			const pdp = presentation?.stayProductDetailPage as Record<string, unknown>;
			const sectionsContainer = pdp?.sections as Record<string, unknown>;
			const sbuiData = sectionsContainer?.sbuiData as Record<string, unknown>;
			const config = sbuiData?.sectionConfiguration as Record<string, unknown>;
			const root = config?.root as Record<string, unknown>;
			const rootSections = root?.sections as NiobeSbuiSection[];

			return rootSections ?? [];
		} catch {
			// Not the right script
		}
	}
	return [];
}

/**
 * Extract metadata (logging context) from the niobeClientData.
 */
function extractMetadata(doc: Document): Record<string, unknown> | null {
	const scripts = selectAll("script", doc) as unknown as Element[];
	for (const script of scripts) {
		const src = getAttributeValue(script, "src");
		if (src) continue;
		const type = getAttributeValue(script, "type");
		if (type === "application/ld+json") continue;

		const raw = textContent(script).trim();
		if (!raw.startsWith('{"niobeClientData"')) continue;

		try {
			const parsed = JSON.parse(raw) as { niobeClientData?: unknown[][] };
			const niobe = parsed.niobeClientData;
			if (!Array.isArray(niobe) || niobe.length === 0) continue;

			const entry = niobe[0];
			if (!Array.isArray(entry) || entry.length < 2) continue;

			const payload = entry[1] as Record<string, unknown>;
			const data = payload?.data as Record<string, unknown>;
			const presentation = data?.presentation as Record<string, unknown>;
			const pdp = presentation?.stayProductDetailPage as Record<string, unknown>;
			const sectionsContainer = pdp?.sections as Record<string, unknown>;
			const metadata = sectionsContainer?.metadata as Record<string, unknown>;

			return metadata ?? null;
		} catch {
			// Not the right script
		}
	}
	return null;
}

function getSectionByType(sections: NiobeSection[], typename: string): Record<string, unknown> | null {
	for (const sec of sections) {
		const section = sec.section;
		if (section && section.__typename === typename) {
			return section;
		}
	}
	return null;
}

function extractFromNiobe(doc: Document): Partial<AirbnbExtracted> {
	const result: Partial<AirbnbExtracted> = {};

	const sections = extractNiobeData(doc);
	if (!sections) return result;

	// ── Title section ──
	const titleSection = getSectionByType(sections, "PdpTitleSection");
	if (titleSection) {
		result.name = typeof titleSection.title === "string" ? titleSection.title : null;

		// Extract from embedData within shareSave
		const shareSave = titleSection.shareSave as Record<string, unknown> | undefined;
		const embedData = shareSave?.embedData as Record<string, unknown> | undefined;
		if (embedData) {
			result.propertyType = typeof embedData.propertyType === "string" ? embedData.propertyType : null;
			result.reviewCount = typeof embedData.reviewCount === "number" ? String(embedData.reviewCount) : null;
			result.rating = typeof embedData.starRating === "number" ? String(embedData.starRating) : null;
			result.listingId = typeof embedData.id === "string" ? embedData.id : null;
		}
	}

	// ── Description section ──
	const descSection = getSectionByType(sections, "PdpDescriptionSection");
	if (descSection) {
		const htmlDesc = descSection.htmlDescription as Record<string, unknown> | undefined;
		if (htmlDesc && typeof htmlDesc.htmlText === "string") {
			// Strip HTML tags for clean text
			result.description = htmlDesc.htmlText
				.replace(/<br\s*\/?>/gi, "\n")
				.replace(/<[^>]+>/g, "")
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&#39;/g, "'")
				.replace(/&quot;/g, '"')
				.trim() || null;
		}
	}

	// ── Amenities section ──
	const amenitiesSection = getSectionByType(sections, "AmenitiesSection");
	if (amenitiesSection) {
		const amenities: string[] = [];
		const seen = new Set<string>();

		// Use seeAllAmenitiesGroups for the complete list, fall back to previewAmenitiesGroups
		const groups = (amenitiesSection.seeAllAmenitiesGroups ?? amenitiesSection.previewAmenitiesGroups) as
			| Record<string, unknown>[]
			| undefined;
		if (Array.isArray(groups)) {
			for (const group of groups) {
				const groupTitle = typeof group.title === "string" ? group.title : null;
				// Skip "Not included" group
				if (groupTitle?.toLowerCase() === "not included") continue;

				const items = group.amenities as Record<string, unknown>[] | undefined;
				if (!Array.isArray(items)) continue;

				for (const item of items) {
					if (item.available === false) continue;
					const title = typeof item.title === "string" ? item.title : null;
					if (title && !seen.has(title)) {
						seen.add(title);
						amenities.push(title);
					}
				}
			}
		}

		result.amenities = amenities;
	}

	// ── Host section ──
	const hostSection = getSectionByType(sections, "MeetYourHostSection");
	if (hostSection) {
		const cardData = hostSection.cardData as Record<string, unknown> | undefined;
		if (cardData) {
			result.hostName = typeof cardData.name === "string" ? cardData.name : null;
			result.hostIsSuperhost = cardData.isSuperhost === true;

			const stats = cardData.stats as Record<string, unknown>[] | undefined;
			if (Array.isArray(stats)) {
				for (const stat of stats) {
					if (stat.type === "YEARS_HOSTING" && typeof stat.value === "string") {
						result.hostYearsHosting = stat.value;
					}
				}
			}
		}

		result.hostAbout = typeof hostSection.about === "string" ? hostSection.about : null;

		const hostDetails = hostSection.hostDetails as string[] | undefined;
		if (Array.isArray(hostDetails)) {
			for (const detail of hostDetails) {
				if (typeof detail === "string" && detail.toLowerCase().includes("response rate")) {
					result.hostResponseRate = detail;
				}
			}
		}
	}

	// ── Reviews section ──
	const reviewsSection = getSectionByType(sections, "StayPdpReviewsSection");
	if (reviewsSection) {
		result.rating = typeof reviewsSection.overallRating === "number" ? String(reviewsSection.overallRating) : result.rating;
		result.reviewCount = typeof reviewsSection.overallCount === "number" ? String(reviewsSection.overallCount) : result.reviewCount;

		const categoryRatings: { category: string; rating: string }[] = [];
		const ratings = reviewsSection.ratings as Record<string, unknown>[] | undefined;
		if (Array.isArray(ratings)) {
			for (const r of ratings) {
				const label = typeof r.label === "string" ? r.label : null;
				const localizedRating = typeof r.localizedRating === "string" ? r.localizedRating : null;
				if (label && localizedRating) {
					categoryRatings.push({ category: label, rating: localizedRating });
				}
			}
		}
		result.categoryRatings = categoryRatings;
	}

	// ── Location section ──
	const locationSection = getSectionByType(sections, "LocationSection");
	if (locationSection) {
		result.locationSubtitle = typeof locationSection.subtitle === "string" ? locationSection.subtitle : null;
		result.latitude = typeof locationSection.lat === "number" ? locationSection.lat : null;
		result.longitude = typeof locationSection.lng === "number" ? locationSection.lng : null;

		// Extract neighborhood highlights
		const details = locationSection.previewLocationDetails as Record<string, unknown>[] | undefined;
		if (Array.isArray(details)) {
			for (const detail of details) {
				const content = detail.content as Record<string, unknown> | undefined;
				if (content && typeof content.htmlText === "string") {
					result.neighborhoodHighlights = content.htmlText
						.replace(/<br\s*\/?>/gi, "\n")
						.replace(/<[^>]+>/g, "")
						.trim() || null;
					break;
				}
			}
		}
	}

	// ── Highlights section ──
	const highlightsSection = getSectionByType(sections, "PdpHighlightsSection");
	if (highlightsSection) {
		const highlights: string[] = [];
		const items = highlightsSection.highlights as Record<string, unknown>[] | undefined;
		if (Array.isArray(items)) {
			for (const item of items) {
				const title = typeof item.title === "string" ? item.title : null;
				const subtitle = typeof item.subtitle === "string" ? item.subtitle : null;
				if (title) {
					highlights.push(subtitle ? `${title}: ${subtitle}` : title);
				}
			}
		}
		result.highlights = highlights;
	}

	// ── House rules / Policies section ──
	const policiesSection = getSectionByType(sections, "PoliciesSection");
	if (policiesSection) {
		const houseRules: string[] = [];
		const rules = policiesSection.houseRules as Record<string, unknown>[] | undefined;
		if (Array.isArray(rules)) {
			for (const rule of rules) {
				const title = typeof rule.title === "string" ? rule.title : null;
				if (title) houseRules.push(title);
			}
		}
		result.houseRules = houseRules;

		const safetyItems: string[] = [];
		const safety = policiesSection.previewSafetyAndProperties as Record<string, unknown>[] | undefined;
		if (Array.isArray(safety)) {
			for (const item of safety) {
				const title = typeof item.title === "string" ? item.title : null;
				if (title) safetyItems.push(title);
			}
		}
		result.safetyItems = safetyItems;
	}

	// ── Hero images ──
	const heroSection = getSectionByType(sections, "PdpHeroSection");
	if (heroSection) {
		const images: string[] = [];
		const previewImages = heroSection.previewImages as Record<string, unknown>[] | undefined;
		if (Array.isArray(previewImages)) {
			for (const img of previewImages) {
				const baseUrl = typeof img.baseUrl === "string" ? img.baseUrl : null;
				if (baseUrl) images.push(baseUrl);
			}
		}
		result.images = images;
	}

	// ── Sleeping arrangement ──
	const sleepingSection = getSectionByType(sections, "SleepingArrangementSection");
	if (sleepingSection) {
		const arrangements = sleepingSection.arrangementDetails as Record<string, unknown>[] | undefined;
		if (Array.isArray(arrangements) && arrangements.length > 0) {
			const first = arrangements[0];
			if (first && typeof first.subtitle === "string") {
				result.beds = first.subtitle;
			}
		}
	}

	// ── Overview from sbuiData ──
	const sbuiSections = extractSbuiSections(doc);
	for (const sbui of sbuiSections) {
		const sectionData = sbui.sectionData;
		if (!sectionData) continue;

		if (sectionData.__typename === "PdpOverviewV2Section") {
			if (!result.propertyType && typeof sectionData.title === "string") {
				result.propertyType = sectionData.title;
			}

			const overviewItems = sectionData.overviewItems as Record<string, unknown>[] | undefined;
			if (Array.isArray(overviewItems)) {
				for (const item of overviewItems) {
					const title = typeof item.title === "string" ? item.title : "";
					if (title.includes("guest")) result.guests = title;
					else if (title.includes("bed") && !title.includes("bedroom")) result.beds = result.beds ?? title;
					else if (title.includes("bedroom") || title === "Studio") result.bedrooms = title;
					else if (title.includes("bath")) result.bathrooms = title;
				}
			}
		}

		if (sectionData.__typename === "PdpHostOverviewDefaultSection") {
			if (!result.hostName && typeof sectionData.title === "string") {
				// "Hosted by My" → "My"
				const match = sectionData.title.match(/^Hosted by\s+(.+)$/i);
				if (match) result.hostName = match[1] ?? null;
			}
		}
	}

	// ── Metadata (logging context for room type, person capacity) ──
	const metadata = extractMetadata(doc);
	if (metadata) {
		const loggingCtx = metadata.loggingContext as Record<string, unknown> | undefined;
		const eventData = loggingCtx?.eventDataLogging as Record<string, unknown> | undefined;
		if (eventData) {
			if (!result.listingId && typeof eventData.listingId === "string") {
				result.listingId = eventData.listingId;
			}
			if (!result.propertyType && typeof eventData.roomType === "string") {
				result.propertyType = eventData.roomType;
			}
			if (!result.guests && typeof eventData.personCapacity === "number") {
				result.guests = `${eventData.personCapacity} guests`;
			}
		}

		const sharingConfig = metadata.sharingConfig as Record<string, unknown> | undefined;
		if (sharingConfig) {
			if (!result.address && typeof sharingConfig.location === "string") {
				result.address = sharingConfig.location;
			}
		}
	}

	return result;
}

// ── JSON-LD extraction ──────────────────────────────────────────────────────

const AIRBNB_LD_TYPES = new Set(["VacationRental", "Accommodation", "LodgingBusiness", "Product"]);

function extractFromJsonLd(jsonLdItems: unknown[]): Partial<AirbnbExtracted> {
	const result: Partial<AirbnbExtracted> = {};

	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		const type = typeof obj["@type"] === "string" ? obj["@type"] : null;
		if (!type || !AIRBNB_LD_TYPES.has(type)) continue;

		// Prefer VacationRental over Product for primary data
		if (type === "Product" && result.name) continue;

		if (typeof obj.name === "string") result.name = obj.name;
		if (typeof obj.description === "string") result.description = obj.description;

		// Address
		const address = obj.address as Record<string, unknown> | undefined;
		if (address) {
			const parts = [
				typeof address.streetAddress === "string" ? address.streetAddress : "",
				typeof address.addressLocality === "string" ? address.addressLocality : "",
				typeof address.addressRegion === "string" ? address.addressRegion : "",
				typeof address.addressCountry === "string" ? address.addressCountry : "",
			].filter(Boolean);
			if (parts.length > 0) result.address = parts.join(", ");
		}

		// Rating
		const ratingObj = obj.aggregateRating as Record<string, unknown> | undefined;
		if (ratingObj) {
			result.rating = ratingObj.ratingValue != null ? String(ratingObj.ratingValue) : null;
			result.reviewCount = ratingObj.ratingCount != null ? String(ratingObj.ratingCount) : null;
		}

		// Images
		if (Array.isArray(obj.image)) {
			const images: string[] = [];
			for (const img of obj.image) {
				if (typeof img === "string") images.push(img);
			}
			if (images.length > 0 && !result.images) result.images = images;
		}

		// Coordinates
		if (typeof obj.latitude === "number") result.latitude = obj.latitude;
		if (typeof obj.longitude === "number") result.longitude = obj.longitude;

		// Price from Product offers
		if (type === "Product") {
			const offers = obj.offers as Record<string, unknown> | undefined;
			if (offers && !result.price) {
				const priceVal = offers.price ?? offers.lowPrice;
				const currency = typeof offers.priceCurrency === "string" ? offers.priceCurrency : "";
				if (priceVal != null) {
					result.price = currency ? `${currency} ${priceVal}` : String(priceVal);
				}
			}
		}

		// Occupancy
		const containsPlace = obj.containsPlace as Record<string, unknown> | undefined;
		const occupancy = containsPlace?.occupancy as Record<string, unknown> | undefined;
		if (occupancy && typeof occupancy.value === "number") {
			result.guests = `${occupancy.value} guests`;
		}
	}

	return result;
}

// ── 404 detection ───────────────────────────────────────────────────────────

function is404Page(doc: Document): boolean {
	const titleEl = selectOne("title", doc) as Element | null;
	if (titleEl) {
		const title = textContent(titleEl).trim();
		if (title.includes("404") && title.includes("Page Not Found")) return true;
	}
	return false;
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseAirbnb(html: string, url: string): LodgingData {
	const doc = parseDocument(html);

	// Detect 404 pages (delisted listings)
	if (is404Page(doc)) {
		throw new Error("Airbnb listing not found (404)");
	}

	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");
	const metaDesc = getMeta(doc, "description");

	// 1. Extract from niobeClientData (richest source)
	const niobeData = extractFromNiobe(doc);

	// 2. Extract from JSON-LD (VacationRental / Product)
	const jsonLdItems = extractJsonLd(doc);
	const jsonLdData = extractFromJsonLd(jsonLdItems);

	// 3a. DOM fallbacks for browser-rendered pages (niobeClientData consumed by React)
	let domName: string | null = null;
	let domDescription: string | null = null;
	let domRating: string | null = null;
	let domReviewCount: string | null = null;
	let domAddress: string | null = null;
	let domPrice: string | null = null;
	let domPropertyType: string | null = null;
	let domHostName: string | null = null;
	const domAmenities: string[] = [];

	// Title/name from the main heading
	const h1 = selectOne("h1", doc) as Element | null;
	if (h1) {
		domName = textContent(h1).trim() || null;
	}

	// Rating from star rating display
	const ratingEl = selectOne('[class*="rating"], [aria-label*="rating"], [data-testid*="rating"]', doc) as Element | null;
	if (ratingEl) {
		const rText = textContent(ratingEl).trim();
		const rMatch = rText.match(/(\d+\.?\d*)/);
		if (rMatch) domRating = rMatch[1];
	}

	// Review count
	const reviewEls = selectAll('button, a, span', doc) as unknown as Element[];
	for (const el of reviewEls) {
		const text = textContent(el).trim();
		const revMatch = text.match(/(\d[\d,]*)\s+reviews?/i);
		if (revMatch) {
			domReviewCount = revMatch[1].replace(/,/g, "");
			break;
		}
	}

	// Description from about section
	const descCandidates = selectAll('[data-section-id="DESCRIPTION_DEFAULT"] div, [data-section-id="DESCRIPTION"] div', doc) as unknown as Element[];
	for (const el of descCandidates) {
		const text = textContent(el).trim();
		if (text.length > 50) {
			domDescription = text;
			break;
		}
	}

	// Price from pricing section
	const priceEls = selectAll('[class*="price"], [data-testid*="price"]', doc) as unknown as Element[];
	for (const el of priceEls) {
		const text = textContent(el).trim();
		const priceMatch = text.match(/[$€£¥][\d,.]+/);
		if (priceMatch) {
			domPrice = priceMatch[0];
			break;
		}
	}

	// Property type from subtitle
	const subtitleEls = selectAll('h2, [class*="subtitle"]', doc) as unknown as Element[];
	for (const el of subtitleEls) {
		const text = textContent(el).trim();
		if (/entire|private|shared|room|home|apartment|condo|villa|cabin|cottage/i.test(text) && text.length < 100) {
			domPropertyType = text;
			break;
		}
	}

	// Host name
	const hostEls = selectAll('[data-section-id="HOST_PROFILE"] h2, [data-section-id="HOST_OVERVIEW"] h2', doc) as unknown as Element[];
	for (const el of hostEls) {
		const text = textContent(el).trim();
		const hostMatch = text.match(/hosted by (.+)/i);
		if (hostMatch) {
			domHostName = hostMatch[1];
			break;
		}
	}

	// Amenities from what this place offers section
	const amenityEls = selectAll('[data-section-id="AMENITIES_DEFAULT"] div[class*="amenity"], [data-section-id="AMENITIES_DEFAULT"] li', doc) as unknown as Element[];
	for (const el of amenityEls) {
		const text = textContent(el).trim();
		if (text && text.length < 100 && !text.includes("Show all")) {
			domAmenities.push(text);
		}
	}

	// 3b. Merge: niobeClientData wins, JSON-LD fills gaps, DOM fills more gaps, meta tags as last resort
	const name = niobeData.name ?? jsonLdData.name ?? domName ?? ogDesc ?? null;
	const description = niobeData.description ?? jsonLdData.description ?? domDescription ?? metaDesc ?? null;
	const rating = niobeData.rating ?? jsonLdData.rating ?? domRating ?? null;
	const reviewCount = niobeData.reviewCount ?? jsonLdData.reviewCount ?? domReviewCount ?? null;
	const amenities = niobeData.amenities?.length ? niobeData.amenities : (domAmenities.length ? domAmenities : []);

	// Build address from location subtitle or JSON-LD
	const address = niobeData.locationSubtitle ?? niobeData.address ?? jsonLdData.address ?? domAddress ?? null;

	if (!name && !description && !ogTitle && !pageTitle) {
		throw new Error("No Airbnb listing content found");
	}

	// Clean up title — strip " - Airbnb" or " - Condominiums for Rent ..." suffix
	const rawTitle = name ?? ogTitle ?? pageTitle ?? "";
	const title = rawTitle
		.replace(/\s*-\s*(?:Condominiums|Apartments|Houses|Villas|Cabins|Cottages|Rooms|Homes)\s+for\s+Rent.*$/i, "")
		.replace(/\s*[-|]\s*Airbnb$/i, "")
		.trim() || null;

	return {
		type: "lodging",
		title,
		url,
		name: name ?? ogDesc ?? null,
		description,
		address,
		rating,
		reviewCount,
		amenities,
		// Extended fields from niobeClientData / JSON-LD
		listingId: niobeData.listingId ?? null,
		propertyType: niobeData.propertyType ?? jsonLdData.propertyType ?? domPropertyType ?? null,
		price: niobeData.price ?? jsonLdData.price ?? domPrice ?? null,
		guests: niobeData.guests ?? jsonLdData.guests ?? null,
		bedrooms: niobeData.bedrooms ?? null,
		beds: niobeData.beds ?? null,
		bathrooms: niobeData.bathrooms ?? null,
		hostName: niobeData.hostName ?? domHostName ?? null,
		hostIsSuperhost: niobeData.hostIsSuperhost ?? false,
		hostYearsHosting: niobeData.hostYearsHosting ?? null,
		hostAbout: niobeData.hostAbout ?? null,
		hostResponseRate: niobeData.hostResponseRate ?? null,
		highlights: niobeData.highlights ?? [],
		houseRules: niobeData.houseRules ?? [],
		safetyItems: niobeData.safetyItems ?? [],
		categoryRatings: niobeData.categoryRatings ?? [],
		neighborhoodHighlights: niobeData.neighborhoodHighlights ?? null,
		images: niobeData.images ?? jsonLdData.images ?? [],
		latitude: niobeData.latitude ?? jsonLdData.latitude ?? null,
		longitude: niobeData.longitude ?? jsonLdData.longitude ?? null,
	};
}
