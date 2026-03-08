/**
 * trustpilot.ts — Parser for Trustpilot business review pages.
 *
 * URL patterns handled:
 *   Business page: /review/<domain>
 *
 * Extraction priority: __NEXT_DATA__ JSON blob → og:* meta tags.
 *
 * Trustpilot embeds a large __NEXT_DATA__ script containing businessUnit
 * details (name, trustScore, stars, categories, contactInfo) and an array
 * of up to 20 reviews with title, text, rating, consumer, and dates.
 */

import { selectOne } from "css-select";
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

function extractNextData(doc: Document): Record<string, unknown> | null {
	const script = selectOne('script[id="__NEXT_DATA__"]', doc) as Element | null;
	if (!script) return null;
	const raw = textContent(script).trim();
	if (!raw) return null;
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return null;
	}
}

// ── __NEXT_DATA__ extraction ────────────────────────────────────────────────

interface NextDataResult {
	found: boolean;
	name: string | null;
	rating: string | null;
	reviewCount: string | null;
	categories: string[];
	address: string | null;
	phone: string | null;
	website: string | null;
	description: string | null;
	reviews: BusinessReview[];
}

function extractFromNextData(nextData: Record<string, unknown>): NextDataResult {
	const empty: NextDataResult = {
		found: false,
		name: null,
		rating: null,
		reviewCount: null,
		categories: [],
		address: null,
		phone: null,
		website: null,
		description: null,
		reviews: [],
	};

	const props = nextData.props as Record<string, unknown> | undefined;
	if (!props) return empty;
	const pageProps = props.pageProps as Record<string, unknown> | undefined;
	if (!pageProps) return empty;

	const bu = pageProps.businessUnit as Record<string, unknown> | undefined;
	if (!bu) return empty;

	// Name
	const name = typeof bu.displayName === "string" ? bu.displayName : null;

	// Rating (trustScore)
	const rating = bu.trustScore != null ? String(bu.trustScore) : null;

	// Review count
	const reviewCount = bu.numberOfReviews != null ? String(bu.numberOfReviews) : null;

	// Website
	const website = typeof bu.websiteUrl === "string" ? bu.websiteUrl : null;

	// Categories
	const categories: string[] = [];
	if (Array.isArray(bu.categories)) {
		for (const cat of bu.categories as Record<string, unknown>[]) {
			if (typeof cat.name === "string") {
				categories.push(cat.name);
			}
		}
	}

	// Address from contactInfo
	let address: string | null = null;
	const ci = bu.contactInfo as Record<string, unknown> | undefined;
	if (ci) {
		const parts = [
			typeof ci.address === "string" ? ci.address : "",
			typeof ci.city === "string" ? ci.city : "",
			typeof ci.zipCode === "string" ? ci.zipCode : "",
			typeof ci.country === "string" ? ci.country : "",
		].filter(Boolean);
		address = parts.length > 0 ? parts.join(", ") : null;
	}

	// Phone from contactInfo
	let phone: string | null = null;
	if (ci && typeof ci.phone === "string" && ci.phone) {
		phone = ci.phone;
	}

	// Description — build a summary from available data
	let description: string | null = null;
	if (name) {
		const starStr = bu.stars != null ? `${bu.stars} stars` : null;
		const scoreStr = rating ? `TrustScore ${rating}/5` : null;
		const countStr = reviewCount ? `${reviewCount} reviews` : null;
		const catStr = categories.length > 0 ? categories.join(", ") : null;
		const summaryParts = [scoreStr, starStr, countStr, catStr].filter(Boolean);
		if (summaryParts.length > 0) {
			description = `${name}: ${summaryParts.join(" | ")}`;
		}
	}

	// Reviews (up to 20)
	const reviews: BusinessReview[] = [];
	const rawReviews = Array.isArray(pageProps.reviews) ? pageProps.reviews : [];
	for (const rev of (rawReviews as Record<string, unknown>[]).slice(0, 20)) {
		const title = typeof rev.title === "string" ? rev.title : "";
		const text = typeof rev.text === "string" ? rev.text : "";
		const body = title && text ? `${title}\n${text}` : title || text;
		if (!body) continue;

		const revRating = rev.rating != null ? String(rev.rating) : null;

		const consumer = rev.consumer as Record<string, unknown> | undefined;
		const author = consumer && typeof consumer.displayName === "string" ? consumer.displayName : null;

		const dates = rev.dates as Record<string, unknown> | undefined;
		let date: string | null = null;
		if (dates && typeof dates.publishedDate === "string") {
			date = dates.publishedDate;
		}

		reviews.push({ author, rating: revRating, date, body });
	}

	return {
		found: true,
		name,
		rating,
		reviewCount,
		categories,
		address,
		phone,
		website,
		description,
		reviews,
	};
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseTrustpilot(html: string, url: string): BusinessData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");

	// 1. Try __NEXT_DATA__ (primary data source)
	const nextData = extractNextData(doc);
	const nd = nextData ? extractFromNextData(nextData) : null;

	// 2. Assemble fields with og:* fallbacks
	const name = nd?.name ?? ogTitle ?? null;
	const rating = nd?.rating ?? null;
	const reviewCount = nd?.reviewCount ?? null;
	const categories = nd?.categories ?? [];
	const address = nd?.address ?? null;
	const phone = nd?.phone ?? null;
	const website = nd?.website ?? null;
	const description = nd?.description ?? ogDesc ?? null;
	const reviews = nd?.reviews ?? [];

	if (!name && !description && !ogTitle) {
		throw new Error("No Trustpilot business content found");
	}

	// Clean up title — remove " | Trustpilot" or similar suffix
	const title = (name ?? ogTitle ?? pageTitle ?? "")
		.replace(/\s*\|\s*Trustpilot$/i, "")
		.replace(/\s*-\s*Trustpilot$/i, "")
		.trim() || null;

	return {
		type: "business",
		title,
		url,
		name: nd?.name ?? null,
		rating,
		reviewCount,
		categories,
		address,
		phone,
		website,
		description,
		reviews,
	};
}
