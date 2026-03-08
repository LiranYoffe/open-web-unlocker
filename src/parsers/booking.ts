import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { LodgingData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
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
			// Ignore
		}
	}
	return results;
}

const LODGING_TYPES = new Set(["LodgingBusiness", "Hotel", "Hostel", "BedAndBreakfast", "Motel"]);

export function parseBooking(html: string, url: string): LodgingData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// 1. Try JSON-LD (Booking.com has LodgingBusiness schema data)
	const jsonLdItems = extractJsonLd(doc);
	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		const type = obj["@type"];
		if (typeof type === "string" && LODGING_TYPES.has(type)) {
			const name = typeof obj.name === "string" ? obj.name : null;
			const description = typeof obj.description === "string" ? obj.description : null;

			const address = obj.address as Record<string, unknown> | undefined;
			let fullAddress: string | null = null;
			if (address) {
				const street = typeof address.streetAddress === "string" ? address.streetAddress : "";
				const city = typeof address.addressLocality === "string" ? address.addressLocality : "";
				const country = typeof address.addressCountry === "string" ? address.addressCountry : "";
				const joined = [street, city, country].filter(Boolean).join(", ");
				fullAddress = joined || null;
			}

			const ratingObj = obj.aggregateRating as Record<string, unknown> | undefined;
			const ratingValue = ratingObj ? String(ratingObj.ratingValue ?? "") || null : null;
			const reviewCount = ratingObj ? String(ratingObj.reviewCount ?? "") || null : null;

				// Hotel ID from JSON-LD identifier or URL
			let hotelId: string | null = typeof obj.identifier === "string" ? obj.identifier : null;
			if (!hotelId) {
				const hotelMatch = url.match(/\/hotel\/[^/]+\/([^/.?]+)/);
				hotelId = hotelMatch?.[1] ?? null;
			}

			// Images from JSON-LD
			const images: string[] = [];
			if (Array.isArray(obj.image)) {
				for (const img of obj.image) {
					if (typeof img === "string") images.push(img);
					else if (typeof img === "object" && img !== null) {
						const imgObj = img as Record<string, unknown>;
						const contentUrl = typeof imgObj.contentUrl === "string" ? imgObj.contentUrl
							: typeof imgObj.url === "string" ? imgObj.url : null;
						if (contentUrl) images.push(contentUrl);
					}
				}
			}

			if (name || description) {
				// Extract amenities from DOM even when JSON-LD provides other fields
				const facilityWrapper = selectOne("[data-testid='property-most-popular-facilities-wrapper']", doc) as Element | null;
				const jsonLdAmenities: string[] = [];
				if (facilityWrapper) {
					const spans = selectAll("span", facilityWrapper) as unknown as Element[];
					const seen = new Set<string>();
					for (const span of spans) {
						// Skip spans that contain child spans (avoid duplication from nested structure)
						if (selectOne("span", span)) continue;
						const text = textContent(span).trim();
						if (text && text.length > 1 && !text.startsWith("See all") && !text.startsWith("Most popular") && !seen.has(text)) {
							seen.add(text);
							jsonLdAmenities.push(text);
						}
					}
				}

				return {
					type: "lodging",
					title: name || pageTitle,
					url,
					name,
					description,
					address: fullAddress,
					rating: ratingValue,
					reviewCount,
					amenities: jsonLdAmenities,
					hotelId,
					images: images.length > 0 ? images : undefined,
				};
			}
		}
	}

	// 2. Fallback to structural selectors
	const propertyName =
		getText("h2.pp-header__title", doc) ??
		getText("[data-testid='property-name']", doc) ??
		getText("h1", doc) ??
		getMeta(doc, "og:title");

	const description =
		getText("[data-testid='property-description']", doc) ??
		getText(".hp-desc-highlights__item", doc) ??
		getMeta(doc, "og:description");

	const reviewScore = getText("[data-testid='review-score']", doc);

	// Amenities — Booking renders facility names as leaf <span> elements inside the popular-facilities wrapper
	const facilityWrapperFb = selectOne("[data-testid='property-most-popular-facilities-wrapper']", doc) as Element | null;
	const amenities: string[] = [];
	if (facilityWrapperFb) {
		const spans = selectAll("span", facilityWrapperFb) as unknown as Element[];
		const seen = new Set<string>();
		for (const span of spans) {
			if (selectOne("span", span)) continue;
			const text = textContent(span).trim();
			if (text && text.length > 1 && !text.startsWith("See all") && !text.startsWith("Most popular") && !seen.has(text)) {
				seen.add(text);
				amenities.push(text);
			}
		}
	}

	// Hotel ID from URL (DOM fallback path)
	const hotelMatch = url.match(/\/hotel\/[^/]+\/([^/.?]+)/);
	const hotelId = hotelMatch?.[1] ?? null;

	if (!propertyName && !description) {
		throw new Error("No Booking.com content found");
	}

	return {
		type: "lodging",
		title: propertyName || pageTitle,
		url,
		name: propertyName,
		description,
		address: null,
		rating: reviewScore,
		reviewCount: null, // Not structured when coming from DOM
		amenities,
		hotelId,
	};
}
