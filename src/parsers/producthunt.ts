import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { ProductData, ProductReview } from "./page-data";

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getMeta(doc: Document, name: string, attr = "name"): string | null {
	const el = selectOne(`meta[${attr}="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
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

/**
 * Find a JSON-LD object whose @type matches the given type.
 * Handles both string and array @type values (e.g. ["WebApplication", "Product"]).
 */
function findByType(
	items: unknown[],
	type: string,
): Record<string, unknown> | null {
	for (const item of items) {
		const obj = item as Record<string, unknown>;
		const t = obj["@type"];
		if (t === type) return obj;
		if (Array.isArray(t) && t.includes(type)) return obj;
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

/**
 * Extract product data from ProductHunt Apollo SSR hydration scripts.
 * These are `(window[Symbol.for("ApolloSSRDataTransport")] ??= []).push({rehydrate: {...}})` blocks.
 * The JSON contains JS-specific values like `undefined` that need sanitising.
 */
function extractApolloData(doc: Document): {
	reviewCount: number | null;
	rating: number | null;
	aiSummary: string | null;
	reviews: ApolloReview[];
} {
	const result: {
		reviewCount: number | null;
		rating: number | null;
		aiSummary: string | null;
		reviews: ApolloReview[];
	} = { reviewCount: null, rating: null, aiSummary: null, reviews: [] };

	const scripts = selectAll("script", doc) as unknown as Element[];
	for (const script of scripts) {
		const raw = textContent(script);
		if (!raw.includes("ApolloSSRDataTransport")) continue;

		// Extract the JSON argument from .push(...)
		const pushIdx = raw.indexOf(".push(");
		if (pushIdx === -1) continue;
		const jsonStart = pushIdx + 6; // length of ".push("

		// Find matching closing brace
		let depth = 0;
		let jsonEnd = -1;
		for (let i = jsonStart; i < raw.length; i++) {
			if (raw[i] === "{") depth++;
			else if (raw[i] === "}") {
				depth--;
				if (depth === 0) {
					jsonEnd = i + 1;
					break;
				}
			}
		}
		if (jsonEnd === -1) continue;

		const jsonStr = raw
			.slice(jsonStart, jsonEnd)
			// Replace JS `undefined` values with `null` for valid JSON
			.replace(/:undefined/g, ":null")
			.replace(/,undefined/g, ",null");

		let data: Record<string, unknown>;
		try {
			data = JSON.parse(jsonStr) as Record<string, unknown>;
		} catch {
			continue;
		}

		const rehydrate = data.rehydrate as Record<string, unknown> | undefined;
		if (!rehydrate) continue;

		for (const val of Object.values(rehydrate)) {
			const entry = val as Record<string, unknown>;
			if (!entry?.data || typeof entry.data !== "object") continue;
			const inner = entry.data as Record<string, unknown>;
			const product = inner.product as Record<string, unknown> | undefined;
			if (!product || product.__typename !== "Product") continue;

			// Rating + review count from product-level fields
			if (
				typeof product.detailedReviewsCount === "number" &&
				result.reviewCount === null
			) {
				result.reviewCount = product.detailedReviewsCount;
			}
			if (
				typeof product.detailedReviewsRating === "number" &&
				result.rating === null
			) {
				result.rating = product.detailedReviewsRating;
			}

			// AI review summary
			if (
				typeof product.aiDetailedReviewSummary === "string" &&
				result.aiSummary === null
			) {
				result.aiSummary = product.aiDetailedReviewSummary;
			}

			// Detailed reviews
			const detailedReviews = product.detailedReviews as
				| Record<string, unknown>
				| undefined;
			if (detailedReviews?.edges && Array.isArray(detailedReviews.edges)) {
				for (const edge of detailedReviews.edges as Record<
					string,
					unknown
				>[]) {
					const node = edge.node as Record<string, unknown> | undefined;
					if (!node) continue;
					const user = node.user as Record<string, unknown> | undefined;
					result.reviews.push({
						author: typeof user?.name === "string" ? user.name : null,
						rating:
							typeof node.overallRating === "number"
								? node.overallRating
								: null,
						positive: stringVal(node.positiveFeedback) ?? null,
						negative: stringVal(node.negativeFeedback) ?? null,
						createdAt: stringVal(node.createdAt) ?? null,
						pros: extractTagNames(node.selectedPros),
						cons: extractTagNames(node.selectedCons),
					});
				}
			}
		}
	}

	return result;
}

interface ApolloReview {
	author: string | null;
	rating: number | null;
	positive: string | null;
	negative: string | null;
	createdAt: string | null;
	pros: string[];
	cons: string[];
}

function extractTagNames(tags: unknown): string[] {
	if (!Array.isArray(tags)) return [];
	const names: string[] = [];
	for (const tag of tags) {
		const t = tag as Record<string, unknown>;
		if (typeof t.name === "string") names.push(t.name);
	}
	return names;
}

/**
 * Strip HTML tags from a string, returning plain text.
 */
function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, "").trim();
}

export function parseProductHunt(html: string, url: string): ProductData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	let name: string | null = null;
	let brand: string | null = null;
	let price: string | null = null;
	let currency: string | null = null;
	let rating: string | null = null;
	let reviewCount: string | null = null;
	let description: string | null = null;
	const features: string[] = [];
	const specifications: { key: string; value: string }[] = [];
	const topReviews: ProductReview[] = [];

	// ── JSON-LD (primary source) ─────────────────────────────────────────
	const jsonLdItems = extractJsonLd(doc);
	const product =
		findByType(jsonLdItems, "Product") ??
		findByType(jsonLdItems, "WebApplication");

	if (product) {
		const rawName = stringVal(product.name);
		if (rawName) {
			// Strip " by X" suffix if present (e.g. "ChatGPT by OpenAI" -> "ChatGPT")
			name = rawName.replace(/\s+by\s+.+$/i, "").trim();
		}
		description = stringVal(product.description);

		// Author (first maker = brand)
		const authors = product.author;
		if (Array.isArray(authors) && authors.length > 0) {
			const first = authors[0] as Record<string, unknown>;
			brand = stringVal(first.name);
		} else if (
			typeof authors === "object" &&
			authors !== null &&
			!Array.isArray(authors)
		) {
			brand = stringVal((authors as Record<string, unknown>).name);
		}

		// Offers (price)
		const offers = product.offers as Record<string, unknown> | undefined;
		if (offers) {
			const priceVal = offers.price;
			currency = stringVal(offers.priceCurrency) ?? "USD";
			if (priceVal === 0 || priceVal === "0") {
				price = "Free";
			} else if (typeof priceVal === "number") {
				price = `${currency} ${priceVal}`;
			} else if (typeof priceVal === "string" && priceVal.trim()) {
				price =
					priceVal.trim() === "0"
						? "Free"
						: `${currency} ${priceVal.trim()}`;
			}
		}

		// Aggregate rating
		const aggRating = product.aggregateRating as
			| Record<string, unknown>
			| undefined;
		if (aggRating) {
			const ratingVal = aggRating.ratingValue;
			if (typeof ratingVal === "number") rating = String(ratingVal);
			else if (typeof ratingVal === "string") rating = ratingVal;

			const countVal = aggRating.reviewCount ?? aggRating.ratingCount;
			if (typeof countVal === "number") reviewCount = String(countVal);
			else if (typeof countVal === "string") reviewCount = countVal;
		}

		// Specifications from structured fields
		const appCategory = stringVal(product.applicationCategory);
		if (appCategory) {
			specifications.push({ key: "Category", value: appCategory });
		}

		const os = stringVal(product.operatingSystem);
		if (os) {
			specifications.push({ key: "Platform", value: os });
		}

		const datePublished = stringVal(product.datePublished);
		if (datePublished) {
			try {
				const d = new Date(datePublished);
				if (!Number.isNaN(d.getTime())) {
					specifications.push({
						key: "Published",
						value: d.toISOString().split("T")[0] ?? datePublished,
					});
				} else {
					specifications.push({ key: "Published", value: datePublished });
				}
			} catch {
				specifications.push({ key: "Published", value: datePublished });
			}
		}

		const dateModified = stringVal(product.dateModified);
		if (dateModified) {
			try {
				const d = new Date(dateModified);
				if (!Number.isNaN(d.getTime())) {
					specifications.push({
						key: "Updated",
						value: d.toISOString().split("T")[0] ?? dateModified,
					});
				}
			} catch {
				// skip
			}
		}
	}

	// ── Apollo SSR Data (secondary — reviews, AI summary) ────────────────
	const apollo = extractApolloData(doc);

	if (!rating && apollo.rating !== null) {
		rating = String(apollo.rating);
	}
	if (!reviewCount && apollo.reviewCount !== null) {
		reviewCount = String(apollo.reviewCount);
	}

	// Populate features from Apollo data
	if (apollo.aiSummary) {
		features.push(`AI Summary: ${stripHtml(apollo.aiSummary)}`);
	}

	for (const review of apollo.reviews) {
		const parts: string[] = [];
		if (review.author) parts.push(`[${review.author}]`);
		if (review.rating !== null) parts.push(`${review.rating}/5`);
		if (review.positive) parts.push(`Pro: ${stripHtml(review.positive)}`);
		if (review.negative) parts.push(`Con: ${stripHtml(review.negative)}`);
		if (review.pros.length > 0)
			parts.push(`Tags: ${review.pros.join(", ")}`);
		if (parts.length > 0) features.push(parts.join(" - "));

		const bodyParts = [review.positive, review.negative]
			.filter((part): part is string => typeof part === "string" && part.trim().length > 0)
			.map((part) => stripHtml(part));
		if (bodyParts.length > 0) {
			topReviews.push({
				author: review.author,
				rating: review.rating !== null ? String(review.rating) : null,
				date: review.createdAt,
				title: null,
				body: bodyParts.join("\n\n"),
				helpfulVotes: null,
				variant: review.pros.length > 0 ? review.pros.join(", ") : null,
				verified: false,
			});
		}
	}

	// ── DOM fallbacks ────────────────────────────────────────────────────
	if (!name) {
		const h1 = selectOne("h1", doc) as Element | null;
		if (h1) {
			const rawName = textContent(h1).trim();
			if (rawName) {
				name = rawName.replace(/\s+by\s+.+$/i, "").trim();
			}
		}
	}

	if (!name) {
		const ogTitle = getMeta(doc, "og:title", "property");
		if (ogTitle) {
			// Strip " | Product Hunt" suffix and " by X" suffix
			name = ogTitle
				.replace(/\s*\|.*$/, "")
				.replace(/:\s+.*$/, "")
				.replace(/\s+by\s+.+$/i, "")
				.trim();
		}
	}

	if (!description) {
		description =
			getMeta(doc, "og:description", "property") ??
			getMeta(doc, "description");
	}

	if (!name) {
		throw new Error("No ProductHunt content found");
	}

	return {
		type: "product",
		title: pageTitle,
		url,
		platform: "producthunt",
		name,
		...(brand ? { brand } : {}),
		...(price ? { price } : {}),
		...(currency ? { currency } : {}),
		...(rating ? { rating } : {}),
		...(reviewCount ? { reviewCount, totalRatingCount: reviewCount } : {}),
		...(topReviews.length > 0 ? { topReviews } : {}),
		features,
		...(specifications.length > 0 ? { specifications } : {}),
		description,
	};
}
