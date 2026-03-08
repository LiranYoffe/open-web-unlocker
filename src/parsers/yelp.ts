/**
 * yelp.ts — Parser for Yelp business pages.
 *
 * URL patterns handled:
 *   Business page: /biz/<slug>
 *
 * Extraction priority: JSON-LD LocalBusiness/Restaurant → meta tags → DOM selectors.
 *
 * Yelp embeds rich JSON-LD with @type Restaurant/LocalBusiness including
 * name, address, aggregateRating, openingHoursSpecification, telephone,
 * priceRange, servesCuisine, and review array.
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { extractMarkdown } from "../html-to-markdown";
import type {
	BusinessData,
	BusinessReview,
	SearchResult,
	SearchResultsData,
} from "./page-data";

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

function cleanText(value: string): string {
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

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">");
}

const BUSINESS_TYPES = new Set([
	"LocalBusiness",
	"Restaurant",
	"FoodEstablishment",
	"BarOrPub",
	"CafeOrCoffeeShop",
	"Bakery",
	"FastFoodRestaurant",
	"IceCreamShop",
	"Store",
	"AutoRepair",
	"BeautySalon",
	"DaySpa",
	"Dentist",
	"HealthClub",
	"HomeAndConstructionBusiness",
	"MedicalBusiness",
	"ProfessionalService",
	"FinancialService",
	"LegalService",
	"AutomotiveBusiness",
]);

// ── JSON-LD extraction ──────────────────────────────────────────────────────

function extractFromJsonLd(jsonLdItems: unknown[]): Partial<BusinessData> & { found: boolean } {
	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		const type = obj["@type"];

		// Check if type matches any business type
		let isMatch = false;
		if (typeof type === "string") {
			isMatch = BUSINESS_TYPES.has(type);
		} else if (Array.isArray(type)) {
			isMatch = (type as string[]).some((t) => BUSINESS_TYPES.has(t));
		}
		if (!isMatch) continue;

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

		// Categories from servesCuisine or other fields
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

		// Website
		let website: string | null = null;
		if (typeof obj.url === "string" && !obj.url.includes("yelp.com")) {
			website = obj.url;
		}

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
		};
	}

	return { found: false };
}

// ── DOM fallback extraction ─────────────────────────────────────────────────

function extractCategoriesFromDom(doc: Document): string[] {
	// Look for category links in the business header area
	const categories: string[] = [];
	const seen = new Set<string>();

	// Yelp uses links to /search?find_desc=<category> for category links
	const links = selectAll("a", doc) as unknown as Element[];
	for (const link of links) {
		const href = getAttributeValue(link, "href") ?? "";
		if (href.includes("/search?find_desc=") || href.includes("find_desc=")) {
			const text = textContent(link).trim();
			if (text && text.length > 1 && text.length < 60 && !seen.has(text)) {
				seen.add(text);
				categories.push(text);
			}
		}
	}

	return categories;
}

function extractHoursFromDom(doc: Document): { day: string; time: string }[] {
	const hours: { day: string; time: string }[] = [];

	// Look for hours table with data-testid="biz-hours"
	const hoursTable = selectOne('[data-testid="biz-hours"]', doc) as Element | null;
	if (hoursTable) {
		const rows = selectAll("tr", hoursTable) as unknown as Element[];
		for (const row of rows) {
			const th = selectOne("th", row) as Element | null;
			const td = selectOne("td", row) as Element | null;
			if (th && td) {
				const day = textContent(th).trim();
				const time = textContent(td).trim();
				if (day && time) {
					hours.push({ day, time });
				}
			}
		}
	}

	return hours;
}

function extractAmenitiesFromDom(doc: Document): string[] {
	const amenities: string[] = [];
	const seen = new Set<string>();

	// Look for amenities section with data-testid="biz-amenities"
	const amenitiesSection = selectOne('[data-testid="biz-amenities"]', doc) as Element | null;
	if (amenitiesSection) {
		const spans = selectAll("span", amenitiesSection) as unknown as Element[];
		for (const span of spans) {
			// Skip spans that contain child spans (avoid duplication)
			if (selectOne("span", span)) continue;
			const text = textContent(span).trim();
			if (text && text.length > 1 && !seen.has(text)) {
				seen.add(text);
				amenities.push(text);
			}
		}
	}

	return amenities;
}

function extractPhotoCount(doc: Document): string | null {
	// Look for "See all X photos" text
	const allText = selectAll("span", doc) as unknown as Element[];
	for (const span of allText) {
		const text = textContent(span).trim();
		const match = text.match(/See all\s+([\d,]+)\s+photos?/i);
		if (match) {
			return match[1]?.replace(/,/g, "") ?? null;
		}
	}
	return null;
}

function extractReviewsFromDom(doc: Document): BusinessReview[] {
	const reviews: BusinessReview[] = [];

	const reviewEls = selectAll('[data-testid="review"]', doc) as unknown as Element[];
	for (const reviewEl of reviewEls) {
		// Get review text from paragraph
		const bodyEl = selectOne("p", reviewEl) as Element | null;
		const body = bodyEl ? textContent(bodyEl).trim() : "";
		if (!body) continue;

		// Get rating from aria-label
		const ratingDiv = selectOne('[aria-label*="star rating"]', reviewEl) as Element | null;
		let reviewRating: string | null = null;
		if (ratingDiv) {
			const ariaLabel = getAttributeValue(ratingDiv, "aria-label") ?? "";
			const ratingMatch = ariaLabel.match(/(\d+(?:\.\d+)?)\s*star/i);
			if (ratingMatch) reviewRating = ratingMatch[1] ?? null;
		}

		// Get author name (first span in review)
		const spans = selectAll("span", reviewEl) as unknown as Element[];
		let author: string | null = null;
		for (const span of spans) {
			const text = textContent(span).trim();
			// Author names are short, end with a period followed by initial
			if (text && text.length < 40 && /^[A-Z][a-z]+\s[A-Z]\.?$/.test(text)) {
				author = text;
				break;
			}
		}

		// Get date
		let date: string | null = null;
		for (const span of spans) {
			const text = textContent(span).trim();
			// Look for date-like patterns
			if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/i.test(text)) {
				date = text;
				break;
			}
		}

		// Extract review images (Yelp CDN bphoto URLs)
		const images: string[] = [];
		const imgEls = selectAll("img", reviewEl) as unknown as Element[];
		for (const img of imgEls) {
			const src = getAttributeValue(img, "src") ?? "";
			if (src.includes("bphoto")) {
				images.push(src);
			}
		}

		reviews.push({
			author,
			rating: reviewRating,
			date,
			body,
			images: images.length > 0 ? images : undefined,
		});
	}

	return reviews;
}

function extractSearchHeading(doc: Document): string | null {
	const h1 = selectOne("h1", doc) as Element | null;
	return h1 ? textContent(h1).trim() || null : null;
}

function extractSection(markdown: string, heading: string): string {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = markdown.match(new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`));
	return match?.[1] ?? "";
}

function extractBusinessHeader(markdown: string): {
	rating: string | null;
	reviewCount: string | null;
	priceRange: string | null;
	categories: string[];
} {
	const ratingMatch = markdown.match(/^([0-9.]+)\s+\[\(([^)]+)\)\]/m);
	const categoryLineMatch = markdown.match(/^\$+\s+.+$/m);
	const categoryLine = categoryLineMatch?.[0] ?? "";
	const categories = [...categoryLine.matchAll(/\[([^\]]+)\]\(https:\/\/www\.yelp\.com\/search\?[^)]+\)/g)]
		.map((match) => cleanText(match[1] ?? ""))
		.filter(Boolean);
	return {
		rating: ratingMatch?.[1] ?? null,
		reviewCount: ratingMatch?.[2] ? cleanText(ratingMatch[2].replace(/reviews?/i, "")) : null,
		priceRange: categoryLine.match(/(\$+)/)?.[1] ?? null,
		categories,
	};
}

function extractLocationDetails(markdown: string): {
	address: string | null;
	hours: { day: string; time: string }[];
} {
	const section = extractSection(markdown, "Location & Hours");
	const street = section.match(/\[([^\]]+)\]\(https:\/\/www\.yelp\.com\/map\/[^)]+\)/)?.[1] ?? null;
	const lines = section
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	let locality: string | null = null;
	if (street) {
		const streetIndex = lines.findIndex((line) => line.includes(street));
		for (let i = streetIndex + 1; i < lines.length; i++) {
			const line = lines[i] ?? "";
			if (!line || line.startsWith("[") || line.startsWith("|")) continue;
			if (/^Get directions$/i.test(line)) continue;
			locality = line;
			break;
		}
	}

	const hours = lines
		.map((line) => line.match(/^\|\s*([A-Za-z]{3})\s*\|\s*([^|]+?)\s*\|/))
		.filter((match): match is RegExpMatchArray => match !== null)
		.map((match) => ({
			day: match[1] ?? "",
			time: cleanText(match[2] ?? ""),
		}))
		.filter((entry) => entry.day && entry.time);

	return {
		address: [street, locality].filter(Boolean).join(", ") || null,
		hours,
	};
}

function extractAmenitiesFromMarkdown(markdown: string): string[] {
	const section = extractSection(markdown, "Amenities and More");
	return section
		.split("\n")
		.map((line) => line.trim())
		.filter((line) =>
			line &&
			!/^\[/.test(line) &&
			!/^Powered by/i.test(line) &&
			!/^\d+\s+More Attributes$/i.test(line),
		);
}

function extractPhotoCountFromMarkdown(markdown: string): string | null {
	const primary = markdown.match(/See all\s+([0-9.,kK]+)\s+photos/i);
	if (primary?.[1]) return cleanText(primary[1]);
	const secondary = markdown.match(/All photos\s+([0-9.,kK]+)\s+photos/i);
	return secondary?.[1] ? cleanText(secondary[1]) : null;
}

function extractSearchQuery(url: string): string | null {
	try {
		const parsed = new URL(url);
		const term = parsed.searchParams.get("find_desc");
		const location = parsed.searchParams.get("find_loc");
		if (term && location) return `${term} near ${location}`;
		return term ?? location;
	} catch {
		return null;
	}
}

function extractRelatedSearches(markdown: string): string[] {
	const section =
		markdown.match(/## Related Searches[\s\S]*?(?=\n## |\nTrending Searches|\n## Trending Searches|$)/)?.[0] ??
		"";
	const related = new Set<string>();
	for (const match of section.matchAll(/\[([^\]]+)\]\(https:\/\/www\.yelp\.com\/search\?[^)]+\)/g)) {
		const label = decodeHtmlEntities((match[1] ?? "").trim());
		if (label) related.add(label);
	}
	return [...related];
}

function extractPrimarySearchResultsSection(markdown: string): string {
	const startMatch =
		markdown.match(/(?:^|\n)-\s+##\s+All\s+"[^"]+"\s+results[\s\S]*$/i) ??
		markdown.match(/(?:^|\n)##\s+All\s+"[^"]+"\s+results[\s\S]*$/i);
	const scoped = startMatch?.[0] ?? markdown;

	const endMarkers = [
		/\n-\s+##\s+Sponsored Result\b/i,
		/\n-\s+##\s+Can't find the business\?\b/i,
		/\n##\s+Can't find the business\?\b/i,
		/\n-\s+##\s+Related Searches\b/i,
		/\n##\s+Related Searches\b/i,
		/\n-\s+1\s{2,}\n/,
	];
	const endIndexes = endMarkers
		.map((pattern) => scoped.search(pattern))
		.filter((index) => index >= 0);
	if (endIndexes.length === 0) return scoped;
	return scoped.slice(0, Math.min(...endIndexes));
}

function parseYelpMarkdownSearchResultChunk(
	position: number,
	title: string,
	url: string,
	chunk: string,
): SearchResult {
	const lines = chunk
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.filter((line) => !/^Order$/i.test(line) && !/^Get Directions$/i.test(line));

	const ratingLine = lines.find((line) =>
		/^\d(?:\.\d+)?\s+\(([\d.,kK]+)\s+reviews?\)$/i.test(line),
	);
	const rating = ratingLine?.match(/^(\d(?:\.\d+)?)/)?.[1] ?? null;
	const reviewCount = ratingLine?.match(/\(([\d.,kK]+)\s+reviews?\)/i)?.[1] ?? null;

	const locationLine =
		lines.find((line) =>
			!line.startsWith('"') &&
			!line.startsWith("[") &&
			line !== ratingLine &&
			!/^\d(?:\.\d+)?\s+\(([\d.,kK]+)\s+reviews?\)$/i.test(line),
		) ?? null;
	const statusMatch = locationLine?.match(
		/(Open(?: until [^$]+| now)?|Closed(?: until [^$]+| now)?|Opens in .+)$/i,
	);
	const priceMatch = locationLine?.match(/(\${1,4})/);
	let location = locationLine;
	if (location && statusMatch?.[1]) {
		location = location.replace(statusMatch[1], "").trim() || null;
	}
	if (location && priceMatch?.[1]) {
		location = location.replace(priceMatch[1], "").trim() || null;
	}

	const categories = [...chunk.matchAll(/\[([^\]]+)\]\(https:\/\/www\.yelp\.com\/search\?[^)]+\)/g)]
		.map((match) => decodeHtmlEntities((match[1] ?? "").trim()))
		.filter(Boolean);
	const uniqueCategories = [...new Set(categories)];
	const quote =
		lines.find((line) => /^".+"$/s.test(line)) ??
		lines.find((line) => line.startsWith('"'));
	const snippetParts = [
		quote
			? decodeHtmlEntities(quote).replace(/\s+\[more\]\([^)]+\)$/i, "")
			: null,
	]
		.filter(Boolean)
		.map((value) => cleanText(value!));

	return {
		position,
		title: decodeHtmlEntities(title),
		url: decodeHtmlEntities(url).replace(/\?.*$/, ""),
		snippet: snippetParts.join(" — ") || null,
		location,
		rating,
		reviewCount,
		price: priceMatch?.[1] ?? null,
		category:
			uniqueCategories.length > 0 ? uniqueCategories.join(", ") : null,
	};
}

function extractSearchResultsFromMarkdown(markdown: string): SearchResult[] {
	const resultsSection = extractPrimarySearchResultsSection(markdown);
	const headingRegex =
		/^###\s+(\d+)\\?\.\s+\[([^\]]+)\]\((https:\/\/www\.yelp\.com\/[^)\s]+)\)\s*$/gm;
	const matches = [...resultsSection.matchAll(headingRegex)];
	if (matches.length === 0) return [];

	const results: SearchResult[] = [];
	for (let i = 0; i < matches.length; i += 1) {
		const match = matches[i];
		const nextMatch = matches[i + 1];
		const position = Number.parseInt(match[1] ?? "", 10);
		const title = match[2] ?? "";
		const url = match[3] ?? "";
		if (!Number.isFinite(position) || !title || !url) continue;
		const start = match.index! + match[0].length;
		const end = nextMatch?.index ?? resultsSection.length;
		const chunk = resultsSection.slice(start, end);
		results.push(
			parseYelpMarkdownSearchResultChunk(position, title, url, chunk),
		);
	}

	return results;
}

function parseYelpSearch(doc: Document, html: string, url: string): SearchResultsData {
	const jsonLdItems = extractJsonLd(doc);
	const searchPage = jsonLdItems.find((item) => {
		const obj = item as Record<string, unknown>;
		return obj["@type"] === "SearchResultsPage";
	}) as Record<string, unknown> | undefined;

	const itemList = searchPage?.mainEntity as Record<string, unknown> | undefined;
	const entries = Array.isArray(itemList?.itemListElement)
		? (itemList?.itemListElement as Record<string, unknown>[])
		: [];

	const results: SearchResult[] = entries
		.map((entry) => {
			const position =
				typeof entry.position === "number"
					? entry.position
					: typeof entry.position === "string"
						? Number.parseInt(entry.position, 10)
						: null;
			const item = entry.item as Record<string, unknown> | undefined;
			const title = typeof item?.name === "string" ? decodeHtmlEntities(item.name) : null;
			const resultUrl = typeof item?.url === "string" ? decodeHtmlEntities(item.url) : null;
			const snippet = typeof item?.description === "string" ? decodeHtmlEntities(item.description) : null;
			const image =
				item?.image && typeof item.image === "object"
					? (item.image as Record<string, unknown>)
					: null;
			const priceRange =
				typeof item?.priceRange === "string" ? decodeHtmlEntities(item.priceRange) : null;
			const categoryMatch = snippet?.match(/\bfor\s+(.+)$/i);
			const reviewCount = snippet?.match(/\bDiscover\s+([\d.,kK]+)\s+reviews?\b/i)?.[1] ?? null;
			if (!position || !title || !resultUrl) return null;
			const result: SearchResult = {
				position,
				title,
				url: resultUrl,
				snippet,
				imageUrl:
					typeof image?.url === "string"
						? decodeHtmlEntities(image.url)
						: typeof image?.contentUrl === "string"
							? decodeHtmlEntities(image.contentUrl)
							: null,
				reviewCount,
				price: priceRange,
				category: categoryMatch?.[1]?.trim() ?? null,
			};
			return result;
		})
		.filter((result): result is SearchResult => result !== null);

	const markdown = extractMarkdown(html, url).markdown;
	const finalResults =
		results.length > 0 ? results : extractSearchResultsFromMarkdown(markdown);
	if (finalResults.length === 0) throw new Error("No Yelp search results found");

	return {
		type: "search-results",
		title: extractSearchHeading(doc) ?? extractTitle(doc),
		url,
		engine: "yelp",
		query: extractSearchQuery(url),
		results: finalResults,
		relatedSearches: extractRelatedSearches(markdown),
	};
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseYelp(html: string, url: string): BusinessData | SearchResultsData {
	const doc = parseDocument(html);
	const pathname = new URL(url).pathname;

	if (pathname.startsWith("/search")) {
		return parseYelpSearch(doc, html, url);
	}

	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");
	const markdown = extractMarkdown(html, url).markdown;
	const header = extractBusinessHeader(markdown);
	const location = extractLocationDetails(markdown);
	const markdownAmenities = extractAmenitiesFromMarkdown(markdown);
	const markdownPhotoCount = extractPhotoCountFromMarkdown(markdown);

	// 1. Try JSON-LD first (primary data source)
	const jsonLdItems = extractJsonLd(doc);
	const jsonLd = extractFromJsonLd(jsonLdItems);

	// 2. Extract data from DOM as fallback/supplement
	const domCategories = extractCategoriesFromDom(doc);
	const domHours = extractHoursFromDom(doc);
	const domAmenities = extractAmenitiesFromDom(doc);
	const domPhotoCount = extractPhotoCount(doc);
	const domReviews = extractReviewsFromDom(doc);

	// 3. DOM-specific fields
	const address =
		jsonLd.address ??
		location.address ??
		getText('[data-testid="biz-address"]', doc) ??
		null;

	const phone =
		jsonLd.phone ??
		getText('[data-testid="biz-phone"] p', doc) ??
		null;

	// Website from DOM
	let website = jsonLd.website ?? null;
	if (!website) {
		const websiteEl = selectOne('[data-testid="biz-website"] a', doc) as Element | null;
		if (websiteEl) {
			website = getAttributeValue(websiteEl, "href") ?? (textContent(websiteEl).trim() || null);
		}
	}

	// About/description
	const description =
		getText('[data-testid="biz-about"]', doc) ??
		ogDesc ??
		null;

	// Price range from DOM fallback
	const priceRange =
		jsonLd.priceRange ??
		header.priceRange ??
		getText('[data-testid="biz-price-range"]', doc) ??
		null;

	// Name — prefer JSON-LD, fallback to heading, then og:title
	const name = jsonLd.name ?? getText("h1", doc) ?? ogTitle ?? null;

	// Categories — prefer JSON-LD servesCuisine, fallback to DOM links
	const categories =
		header.categories.length > 0
			? header.categories
			: (jsonLd.categories && jsonLd.categories.length > 0)
				? jsonLd.categories
				: domCategories;

	// Hours — prefer JSON-LD, fallback to DOM table
	const hours =
		(jsonLd.hours && jsonLd.hours.length > 0)
			? jsonLd.hours
			: location.hours.length > 0
				? location.hours
				: domHours;

	// Reviews — prefer JSON-LD, fallback to DOM
	const reviews = (jsonLd.reviews && jsonLd.reviews.length > 0) ? jsonLd.reviews : domReviews;

	if (!name && !description && !ogTitle) {
		throw new Error("No Yelp business content found");
	}

	// Business ID from URL /biz/SLUG
	const bizMatch = url.match(/\/biz\/([^/?#]+)/);
	const businessId = bizMatch?.[1] ? decodeURIComponent(bizMatch[1]) : null;

	// Clean up title — remove " - Yelp" suffix
	const title = (name ?? ogTitle ?? pageTitle ?? "")
		.replace(/\s*-\s*Yelp$/i, "")
		.trim() || null;

	return {
		type: "business",
		title,
		url,
		name,
		rating: jsonLd.rating ?? header.rating ?? null,
		reviewCount: jsonLd.reviewCount ?? header.reviewCount ?? null,
		priceRange,
		categories,
		address,
		phone,
		website,
		hours,
		amenities: domAmenities.length > 0 ? domAmenities : markdownAmenities,
		photoCount: domPhotoCount ?? markdownPhotoCount,
		description,
		reviews,
		businessId,
	};
}
