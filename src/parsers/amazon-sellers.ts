/**
 * amazon-sellers.ts — Parser for Amazon seller/storefront profile pages.
 *
 * URL patterns handled:
 *   /sp?seller=<SELLER_ID>
 *   /sp?ie=UTF8&seller=<SELLER_ID>
 *
 * Extraction priority: Stable IDs (Amazon seller pages have rich stable IDs,
 * no JSON-LD). All data comes from DOM selectors using Amazon's stable
 * element IDs (#seller-name, #seller-info-card, #page-section-* etc.).
 *
 * Returns BusinessData to match the existing type system — Amazon seller
 * pages are essentially business profile pages with reviews/ratings.
 *
 * --- INTEGRATION NOTES ---
 * This file is standalone. To integrate into the system, the following
 * changes are needed in OTHER files (not done here per instructions):
 *
 * 1. page-data.ts — No changes needed (uses existing BusinessData)
 * 2. index.ts — Add "amazon-sellers" to PARSER_REGISTRY
 * 3. to-markdown.ts — No changes needed (BusinessData already has a formatter)
 * 4. site config — Add /sp path rules for all Amazon domains
 *    with parser hint "amazon-sellers"
 */

import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { BusinessData, BusinessReview } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "aside", "svg"],
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getInnerHTML(el: Element): string {
	return render(el.children);
}

/**
 * Extract seller ID from the URL query string.
 * Handles both /sp?seller=XXX and /sp?ie=UTF8&seller=XXX patterns.
 */
function extractSellerId(url: string): string | null {
	try {
		const parsed = new URL(url);
		return parsed.searchParams.get("seller") || null;
	} catch {
		return null;
	}
}

// ── Rating extraction ────────────────────────────────────────────────────────

interface SellerRating {
	period: string; // "30 days", "90 days", "12 months", "Lifetime"
	stars: string | null; // e.g. "4.8"
	count: string | null; // e.g. "2,238"
}

function extractRatings(doc: Document): SellerRating[] {
	const ratings: SellerRating[] = [];

	// Each period has a pair: rating-xxx-stars (contains the score) and
	// rating-xxx-num (contains the count). The star value is in a span
	// with class "ratings-reviews" inside the stars container.
	const periods: { id: string; label: string }[] = [
		{ id: "thirty", label: "30 days" },
		{ id: "90", label: "90 days" },
		{ id: "365d", label: "12 months" },
		{ id: "lifetime", label: "Lifetime" },
	];

	for (const { id, label } of periods) {
		const starsContainer = selectOne(
			`#rating-${id}-stars`,
			doc,
		) as Element | null;
		const numContainer = selectOne(
			`#rating-${id}-num`,
			doc,
		) as Element | null;

		let stars: string | null = null;
		let count: string | null = null;

		if (starsContainer) {
			// The numeric rating value is in a span inside the description ID
			const descId = id === "90" ? "ninety" : id === "365d" ? "year" : id;
			const ratingSpan = selectOne(
				`#effective-timeperiod-rating-${descId}-description`,
				starsContainer,
			) as Element | null;
			if (ratingSpan) {
				const text = textContent(ratingSpan).trim();
				const match = text.match(/([\d.]+)/);
				if (match?.[1]) stars = match[1];
			}

			// Fallback: get from a-icon-alt text like "5 out of 5 stars"
			if (!stars) {
				const iconAlt = getText(
					".a-icon-alt",
					starsContainer,
				);
				if (iconAlt) {
					const m = iconAlt.match(/([\d.]+)\s+out\s+of/);
					if (m?.[1]) stars = m[1];
				}
			}
		}

		if (numContainer) {
			const countEl = selectOne(
				".ratings-reviews-count",
				numContainer,
			) as Element | null;
			if (countEl) {
				count = textContent(countEl).trim() || null;
			}
		}

		if (stars || count) {
			ratings.push({ period: label, stars, count });
		}
	}

	return ratings;
}

// ── Rating histogram extraction ──────────────────────────────────────────────

interface RatingHistogram {
	fiveStar: string | null;
	fourStar: string | null;
	threeStar: string | null;
	twoStar: string | null;
	oneStar: string | null;
}

function extractHistogram(doc: Document): RatingHistogram {
	return {
		fiveStar: getText("#percentFiveStar", doc)?.trim() || null,
		fourStar: getText("#percentFourStar", doc)?.trim() || null,
		threeStar: getText("#percentThreeStar", doc)?.trim() || null,
		twoStar: getText("#percentTwoStar", doc)?.trim() || null,
		oneStar: getText("#percentOneStar", doc)?.trim() || null,
	};
}

// ── Feedback/review extraction ───────────────────────────────────────────────

function extractFeedbackReviews(doc: Document): BusinessReview[] {
	const reviews: BusinessReview[] = [];

	// Each feedback row is a .feedback-row container
	const feedbackSection = selectOne(
		"#page-section-feedback",
		doc,
	) as Element | null;
	if (!feedbackSection) return reviews;

	const rows = selectAll(
		".feedback-row",
		feedbackSection,
	) as unknown as Element[];

	for (const row of rows) {
		// Star rating from .a-icon-alt (e.g. "5 out of 5 stars")
		let rating: string | null = null;
		const starAlt = getText(".a-icon-alt", row);
		if (starAlt) {
			const m = starAlt.match(/([\d.]+)\s+out\s+of/);
			if (m?.[1]) rating = m[1];
		}

		// Feedback text — may be in truncated or expanded form
		let body = "";
		// Try expanded text first (full text)
		const expandedEl = selectOne(
			".expandable-expanded-text",
			row,
		) as Element | null;
		if (expandedEl) {
			body = textContent(expandedEl).trim();
		}
		// Fallback to the quoted text span
		if (!body) {
			const textEl = selectOne(
				".a-text-quote",
				row,
			) as Element | null;
			if (textEl) {
				body = textContent(textEl).trim();
			}
		}
		// Fallback to feedback-text div
		if (!body) {
			const feedbackTextDiv = selectOne(
				".feedback-text",
				row,
			) as Element | null;
			if (feedbackTextDiv) {
				body = textContent(feedbackTextDiv).trim();
			}
		}

		if (!body) continue;

		// Author and date from .feedback-rater (e.g. "By SemajNagrom on February 28, 2026.")
		let author: string | null = null;
		let date: string | null = null;
		const raterEl = selectOne(
			".feedback-rater",
			row,
		) as Element | null;
			if (raterEl) {
				const raterText = textContent(raterEl).trim();
			const raterMatch = raterText.match(
				/^By\s+(.+?)\s+on\s+(.+?)\.?\s*$/i,
			);
			if (raterMatch) {
				author = raterMatch[1]?.trim() || null;
				date = raterMatch[2]?.trim() || null;
				}
			}

			const looksSynthetic =
				/template-/i.test(body) ||
				(author !== null && /template-/i.test(author)) ||
				(date !== null && /template-/i.test(date));
			if (looksSynthetic) continue;

			reviews.push({ author, rating, date, body });
		}

	return reviews;
}

function extractPhoneFromText(text: string | null): string | null {
	if (!text) return null;
	const match = text.match(/(?:phone number|phone)\s*[:\-]?\s*(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/i);
	return match?.[1]?.trim() ?? null;
}

// ── Section text extraction ──────────────────────────────────────────────────

/**
 * Extract the "About Seller" section text.
 * Amazon provides both a truncated (spp-expander-less-content) and full
 * (spp-expander-more-content) version. We prefer the full expanded content.
 */
function extractAboutSeller(doc: Document): string | null {
	const aboutSection = selectOne(
		"#spp-expander-about-seller",
		doc,
	) as Element | null;
	if (!aboutSection) return null;

	// Prefer the expanded (full) content
	const expandedEl = selectOne(
		".spp-expander-more-content",
		aboutSection,
	) as Element | null;
	const contentEl = expandedEl
		?? (selectOne(
			".spp-expander-less-content",
			aboutSection,
		) as Element | null);

	if (!contentEl) return null;

	const md = nhm.translate(getInnerHTML(contentEl));
	const cleaned = md
		.replace(/\n{3,}/g, "\n\n")
		.replace(/&nbsp;/g, " ")
		.trim();
	return cleaned || null;
}

/**
 * Extract shipping policies text from #shipping-policies.
 */
function extractShippingPolicies(doc: Document): string | null {
	const el = selectOne("#shipping-policies", doc) as Element | null;
	if (!el) return null;
	const md = nhm.translate(getInnerHTML(el));
	return md.replace(/\n{3,}/g, "\n\n").trim() || null;
}

/**
 * Extract return/refund policies from the return-refunds section.
 */
function extractReturnPolicy(doc: Document): string | null {
	const section = selectOne(
		"#spp-expander-return-and-refund-policies",
		doc,
	) as Element | null;
	if (!section) return null;

	const contentEl = selectOne(
		".spp-expander-more-content",
		section,
	) as Element | null;
	if (!contentEl) return null;

	const md = nhm.translate(getInnerHTML(contentEl));
	return md.replace(/\n{3,}/g, "\n\n").trim() || null;
}

/**
 * Extract detailed seller business information: business name, address.
 */
function extractDetailedSellerInfo(
	doc: Document,
): { businessName: string | null; businessAddress: string | null } {
	const section = selectOne(
		"#page-section-detail-seller-info",
		doc,
	) as Element | null;
	if (!section) return { businessName: null, businessAddress: null };

	let businessName: string | null = null;
	let businessAddress: string | null = null;

	// Business Name and Address are in div rows with a-text-bold label + sibling span
	const rows = selectAll(
		".a-row",
		section,
	) as unknown as Element[];

	const addressParts: string[] = [];
	let inAddress = false;

	for (const row of rows) {
		const fullText = textContent(row).trim();

		if (fullText.startsWith("Business Name:")) {
			// The value is the text after the label
			const labelEl = selectOne(
				".a-text-bold",
				row,
			) as Element | null;
			if (labelEl) {
				const labelText = textContent(labelEl).trim();
				businessName = fullText
					.replace(labelText, "")
					.trim() || null;
			}
			inAddress = false;
		} else if (fullText.startsWith("Business Address:")) {
			inAddress = true;
		} else if (inAddress) {
			// Check if this is an indented address line
			const el = selectOne(".indent-left", row) as Element | null;
			if (el) {
				const line = textContent(el).trim();
				if (line) addressParts.push(line);
			} else {
				// No more indented lines — stop collecting address
				inAddress = false;
			}
		}
	}

	if (addressParts.length > 0) {
		businessAddress = addressParts.join(", ");
	}

	return { businessName, businessAddress };
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseAmazonSeller(
	html: string,
	url: string,
): BusinessData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// ── Seller name (#seller-name h1 — stable ID) ────────────────────────
	const sellerName = getText("#seller-name", doc);

	// ── Seller ID from URL ───────────────────────────────────────────────
	const sellerId = extractSellerId(url);

	// ── Storefront link ──────────────────────────────────────────────────
	let storefrontUrl: string | null = null;
	const storefrontSection = selectOne(
		"#seller-info-storefront-link",
		doc,
	) as Element | null;
	if (storefrontSection) {
		const link = selectOne("a", storefrontSection) as Element | null;
		if (link?.attribs?.href) {
			const href = link.attribs.href;
			// Make absolute if relative
			try {
				storefrontUrl = new URL(href, url).href;
			} catch {
				storefrontUrl = href;
			}
		}
	}

	// ── Feedback summary (header area) ───────────────────────────────────
	// Format: "96% positive in the last 12 months (31483 ratings)"
	let positivePercent: string | null = null;
	let summaryRatingCount: string | null = null;
	const feedbackSummary = selectOne(
		"#seller-info-feedback-summary",
		doc,
	) as Element | null;
	if (feedbackSummary) {
		const summaryText = textContent(feedbackSummary).trim();
		const percentMatch = summaryText.match(/(\d+)%\s+positive/);
		if (percentMatch?.[1]) positivePercent = percentMatch[1];
		const countMatch = summaryText.match(/\((\d[\d,]*)\s+ratings?\)/);
		if (countMatch?.[1]) summaryRatingCount = countMatch[1];
	}

	// ── Multi-period ratings ─────────────────────────────────────────────
	const ratings = extractRatings(doc);

	// Use 12-month rating as the primary rating (most commonly referenced)
	const yearRating = ratings.find((r) => r.period === "12 months");
	const lifetimeRating = ratings.find((r) => r.period === "Lifetime");
	const primaryRating = yearRating ?? lifetimeRating ?? ratings[0] ?? null;

	// ── Rating histogram ─────────────────────────────────────────────────
	const histogram = extractHistogram(doc);

	// ── Customer service phone ───────────────────────────────────────────
	const phone = getText("#seller-contact-phone", doc);

	// ── About seller description ─────────────────────────────────────────
	const aboutText = extractAboutSeller(doc);

	// ── Detailed seller info (business name, address) ────────────────────
	const { businessName, businessAddress } = extractDetailedSellerInfo(doc);

	// ── Shipping policies ────────────────────────────────────────────────
	const shippingPolicies = extractShippingPolicies(doc);

	// ── Return/refund policies ───────────────────────────────────────────
	const returnPolicy = extractReturnPolicy(doc);

	// ── Tax info ─────────────────────────────────────────────────────────
	const taxInfo = getText("#tax-info-text", doc);

	// ── Feedback reviews ─────────────────────────────────────────────────
	const feedbackReviews = extractFeedbackReviews(doc);

	// ── A-to-Z guarantee text ────────────────────────────────────────────
	const atozText = getText("#a2z-trustbooster-text", doc);

	// ── Bail if no meaningful content ────────────────────────────────────
	if (!sellerName && !aboutText && feedbackReviews.length === 0) {
		throw new Error("No Amazon seller content found");
	}

	// ── Build description ────────────────────────────────────────────────
	// Combine about text with key seller metadata for a rich description
	const descParts: string[] = [];
	if (aboutText) descParts.push(aboutText);
	if (businessName && businessName !== sellerName) {
		descParts.push(`Business Name: ${businessName}`);
	}
	if (shippingPolicies) {
		descParts.push(`Shipping: ${shippingPolicies}`);
	}
	if (returnPolicy) {
		descParts.push(`Returns: ${returnPolicy}`);
	}
	if (taxInfo) {
		descParts.push(`Tax Info: ${taxInfo}`);
	}
	const description = descParts.length > 0
		? descParts.join("\n\n")
		: null;

	// ── Build rating string ──────────────────────────────────────────────
	// Include multi-period breakdown
	let ratingStr: string | null = null;
	if (primaryRating?.stars) {
		ratingStr = primaryRating.stars;
	}

	// ── Build review count ───────────────────────────────────────────────
	const reviewCount = summaryRatingCount
		?? primaryRating?.count?.replace(/,/g, "")
		?? null;

	// ── Build amenities (used for policies/features summary) ─────────────
	const amenities: string[] = [];
	if (positivePercent) {
		amenities.push(`${positivePercent}% positive feedback (12 months)`);
	}
	// Add multi-period rating breakdown
	for (const r of ratings) {
		if (r.stars && r.count) {
			amenities.push(
				`${r.period}: ${r.stars}/5 (${r.count} ratings)`,
			);
		}
	}
	// Add histogram
	const histEntries = [
		{ label: "5 star", val: histogram.fiveStar },
		{ label: "4 star", val: histogram.fourStar },
		{ label: "3 star", val: histogram.threeStar },
		{ label: "2 star", val: histogram.twoStar },
		{ label: "1 star", val: histogram.oneStar },
	];
	const histParts = histEntries
		.filter((e) => e.val)
		.map((e) => `${e.label}: ${e.val}`);
	if (histParts.length > 0) {
		amenities.push(`Rating breakdown: ${histParts.join(", ")}`);
	}
	if (atozText) {
		amenities.push(`A-to-Z Guarantee: ${atozText}`);
	}

	// ── Build title ──────────────────────────────────────────────────────
	const cleanTitle = sellerName
		?? pageTitle?.replace(/\s*[-|]?\s*Amazon\.com.*$/i, "").trim()
		?? null;

	return {
		type: "business",
		title: cleanTitle,
			url,
			name: sellerName,
			rating: ratingStr,
			reviewCount,
			address: businessAddress,
			phone: phone ?? extractPhoneFromText(aboutText),
			website: storefrontUrl,
			amenities,
			description,
			reviews: feedbackReviews,
			businessId: sellerId,
		};
	}
