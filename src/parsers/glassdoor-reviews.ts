/**
 * glassdoor-reviews.ts — Parser for Glassdoor company review listing pages.
 *
 * URL patterns handled:
 *   Company reviews:  /Reviews/<Company>-Reviews-E<id>.htm
 *
 * This parser is separate from glassdoor.ts (which handles /Overview/ company
 * pages and /job-listing/ job pages). It focuses on extracting individual
 * employee reviews with structured pros, cons, job title, and ratings.
 *
 * Extraction priority:
 *   1. Apollo GraphQL cache (embedded in inline script / __NEXT_DATA__)
 *   2. JSON-LD EmployerAggregateRating (company-level rating)
 *   3. DOM selectors: data-test attributes (pros, cons), review containers
 *
 * Returns: BusinessData — uses the `reviews` array with `BusinessReview`
 * entries. Each review's `body` encodes structured fields as:
 *   "**<jobTitle>** (<employmentStatus>)\n\n**Pros:** ...\n\n**Cons:** ..."
 *
 * NOTE: Glassdoor heavily protects with Cloudflare. The unlock-rules config
 * should use browser_dc/browser_res strategies for this domain.
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

function normalizeText(value: string | null | undefined): string | null {
	if (!value) return null;
	const normalized = value.trim().replace(/\s+/g, " ");
	return normalized || null;
}

function looksLikeEmploymentMeta(value: string): boolean {
	return /^(current|former)\s+employee\b/i.test(value) ||
		/\b(more than|less than)\b/i.test(value) ||
		/\b\d+\s+(year|years|month|months)\b/i.test(value) ||
		/\b(full[- ]time|part[- ]time|contract|contractor|intern(ship)?)\b/i.test(value);
}

function normalizeReviewLocation(value: string | null | undefined): string | null {
	const normalized = normalizeText(value);
	if (!normalized) return null;
	return looksLikeEmploymentMeta(normalized) ? null : normalized;
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

// ── Challenge / login wall detection ─────────────────────────────────────────

function isChallengeOrLoginWall(doc: Document): boolean {
	const pageTitle = extractTitle(doc);
	if (pageTitle && /just a moment|security check|verify you are human/i.test(pageTitle)) {
		return true;
	}
	// Glassdoor login wall
	const bodyText = getText("body", doc);
	if (bodyText && /sign in to see all reviews|log in to continue/i.test(bodyText)) {
		return true;
	}
	return false;
}

// ── Apollo GraphQL state extraction ──────────────────────────────────────────

interface ApolloReview {
	reviewId: string | null;
	summary: string | null;
	ratingOverall: number | null;
	ratingCeo: number | null;
	ratingWorkLifeBalance: number | null;
	ratingCultureAndValues: number | null;
	ratingDiversityAndInclusion: number | null;
	ratingSeniorLeadership: number | null;
	ratingCompensationAndBenefits: number | null;
	ratingCareerOpportunities: number | null;
	ratingBusinessOutlook: number | null;
	ratingRecommendToFriend: number | null;
	pros: string | null;
	cons: string | null;
	advice: string | null;
	jobTitle: string | null;
	isCurrentJob: boolean | null;
	employmentStatus: string | null;
	reviewDateTime: string | null;
	lengthOfEmployment: number | null;
	countHelpful: number | null;
	countNotHelpful: number | null;
	location: string | null;
}

interface ApolloCompanyData {
	companyName: string | null;
	overallRating: string | null;
	reviewCount: string | null;
	ceoName: string | null;
	ceoApproval: string | null;
	recommendToFriend: string | null;
	reviews: ApolloReview[];
}

/**
 * Parse Apollo GraphQL cache objects from Glassdoor HTML.
 *
 * Glassdoor uses Apollo Client whose cache may appear in:
 *   - window.__APOLLO_STATE__ or window.apolloState
 *   - __NEXT_DATA__ → props.pageProps.apolloState
 *   - Inline script containing serialized Apollo cache
 *
 * The cache contains EmployerReview objects keyed by typename + id.
 */
function extractApolloData(doc: Document): ApolloCompanyData | null {
	const scripts = selectAll("script", doc) as unknown as Element[];

	for (const script of scripts) {
		// Skip scripts with src attribute (external scripts)
		if (getAttributeValue(script, "src")) continue;

		const raw = textContent(script).trim();
		if (!raw || raw.length < 100) continue;

		// Strategy 1: __NEXT_DATA__ with apolloState
		if (getAttributeValue(script, "id") === "__NEXT_DATA__") {
			try {
				const nextData = JSON.parse(raw) as Record<string, unknown>;
				const props = nextData.props as Record<string, unknown> | undefined;
				const pageProps = props?.pageProps as Record<string, unknown> | undefined;
				const apolloState = pageProps?.apolloState as Record<string, unknown> | undefined;
				if (apolloState) {
					const result = parseApolloState(apolloState);
					if (result) return result;
				}
			} catch {
				// Not valid JSON
			}
			continue;
		}

		// Strategy 2: window.apolloState or window.__APOLLO_STATE__
		const apolloMatch = raw.match(
			/(?:window\.__APOLLO_STATE__|window\.apolloState)\s*=\s*({[\s\S]+?});?\s*(?:$|<\/script|window\.)/,
		);
		if (apolloMatch?.[1]) {
			try {
				const state = JSON.parse(apolloMatch[1]) as Record<string, unknown>;
				const result = parseApolloState(state);
				if (result) return result;
			} catch {
				// Not valid JSON
			}
		}

		// Strategy 3: Look for serialized Apollo cache in any script containing EmployerReview
		if (raw.includes("EmployerReview") && raw.includes('"pros"')) {
			// Try to find a large JSON object assignment
			const jsonMatch = raw.match(
				/(?:var|let|const)\s+\w+\s*=\s*({[\s\S]+?});?\s*$/,
			);
			if (jsonMatch?.[1]) {
				try {
					const state = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
					const result = parseApolloState(state);
					if (result) return result;
				} catch {
					// Not valid JSON
				}
			}
		}
	}

	return null;
}

function parseApolloState(state: Record<string, unknown>): ApolloCompanyData | null {
	const reviews: ApolloReview[] = [];
	let companyName: string | null = null;
	let overallRating: string | null = null;
	let reviewCount: string | null = null;
	let ceoName: string | null = null;
	let ceoApproval: string | null = null;
	let recommendToFriend: string | null = null;

	for (const [key, value] of Object.entries(state)) {
		if (!value || typeof value !== "object") continue;
		const obj = value as Record<string, unknown>;
		const typename = obj.__typename as string | undefined;

		// Extract employer info
		if (typename === "Employer" || key.startsWith("Employer:")) {
			if (typeof obj.shortName === "string") companyName = obj.shortName;
			else if (typeof obj.name === "string") companyName = obj.name;

			// Ratings from employer object
			const ratings = obj.ratings as Record<string, unknown> | undefined;
			if (ratings) {
				if (ratings.overallRating != null) overallRating = String(ratings.overallRating);
				if (ratings.reviewCount != null) reviewCount = String(ratings.reviewCount);
				if (ratings.ceoRating != null) ceoApproval = String(ratings.ceoRating);
				if (ratings.recommendToFriendRating != null) recommendToFriend = String(ratings.recommendToFriendRating);
			}

			// Overall rating directly on employer
			if (!overallRating && obj.overallRating != null) {
				overallRating = String(obj.overallRating);
			}

			// CEO name
			const ceo = obj.ceo as Record<string, unknown> | undefined;
			if (ceo && typeof ceo.name === "string") {
				ceoName = ceo.name;
			}
		}

		// Extract individual reviews
		if (typename === "EmployerReview" || key.startsWith("EmployerReview:")) {
			const review = parseApolloReview(obj, state);
			if (review) reviews.push(review);
		}
	}

	if (reviews.length === 0 && !companyName) return null;

	return { companyName, overallRating, reviewCount, ceoName, ceoApproval, recommendToFriend, reviews };
}

function resolveRef(refOrValue: unknown, state: Record<string, unknown>): Record<string, unknown> | null {
	if (!refOrValue || typeof refOrValue !== "object") return null;
	const obj = refOrValue as Record<string, unknown>;
	if (typeof obj.__ref === "string") {
		const resolved = state[obj.__ref];
		return resolved && typeof resolved === "object" ? (resolved as Record<string, unknown>) : null;
	}
	return obj;
}

function parseApolloReview(obj: Record<string, unknown>, state: Record<string, unknown>): ApolloReview | null {
	const pros = typeof obj.pros === "string" ? obj.pros : null;
	const cons = typeof obj.cons === "string" ? obj.cons : null;

	// Need at least pros or cons to be a valid review
	if (!pros && !cons) return null;

	// Job title — may be a string or a ref to a JobTitle object
	let jobTitle: string | null = null;
	if (typeof obj.jobTitle === "string") {
		jobTitle = obj.jobTitle;
	} else if (obj.jobTitle && typeof obj.jobTitle === "object") {
		const jtObj = resolveRef(obj.jobTitle, state);
		if (jtObj && typeof jtObj.text === "string") jobTitle = jtObj.text;
		else if (jtObj && typeof jtObj.title === "string") jobTitle = jtObj.title;
	}

	// Location — may be a string or ref
	let location: string | null = null;
	if (typeof obj.location === "string") {
		location = normalizeReviewLocation(obj.location);
	} else if (obj.location && typeof obj.location === "object") {
		const locObj = resolveRef(obj.location, state);
		if (locObj) {
			const parts: string[] = [];
			if (typeof locObj.name === "string") parts.push(locObj.name);
			else {
				if (typeof locObj.city === "string") parts.push(locObj.city);
				if (typeof locObj.state === "string") parts.push(locObj.state);
			}
			location = normalizeReviewLocation(parts.length > 0 ? parts.join(", ") : null);
		}
	}

	return {
		reviewId: obj.reviewId != null ? String(obj.reviewId) : null,
		summary: typeof obj.summary === "string" ? obj.summary : null,
		ratingOverall: typeof obj.ratingOverall === "number" ? obj.ratingOverall : null,
		ratingCeo: typeof obj.ratingCeo === "number" ? obj.ratingCeo : null,
		ratingWorkLifeBalance: typeof obj.ratingWorkLifeBalance === "number" ? obj.ratingWorkLifeBalance : null,
		ratingCultureAndValues: typeof obj.ratingCultureAndValues === "number" ? obj.ratingCultureAndValues : null,
		ratingDiversityAndInclusion: typeof obj.ratingDiversityAndInclusion === "number" ? obj.ratingDiversityAndInclusion : null,
		ratingSeniorLeadership: typeof obj.ratingSeniorLeadership === "number" ? obj.ratingSeniorLeadership : null,
		ratingCompensationAndBenefits: typeof obj.ratingCompensationAndBenefits === "number" ? obj.ratingCompensationAndBenefits : null,
		ratingCareerOpportunities: typeof obj.ratingCareerOpportunities === "number" ? obj.ratingCareerOpportunities : null,
		ratingBusinessOutlook: typeof obj.ratingBusinessOutlook === "number" ? obj.ratingBusinessOutlook : null,
		ratingRecommendToFriend: typeof obj.ratingRecommendToFriend === "number" ? obj.ratingRecommendToFriend : null,
		pros,
		cons,
		advice: typeof obj.advice === "string" ? obj.advice : null,
		jobTitle,
		isCurrentJob: typeof obj.isCurrentJob === "boolean" ? obj.isCurrentJob : null,
		employmentStatus: typeof obj.employmentStatus === "string" ? obj.employmentStatus : null,
		reviewDateTime: typeof obj.reviewDateTime === "string" ? obj.reviewDateTime : null,
		lengthOfEmployment: typeof obj.lengthOfEmployment === "number" ? obj.lengthOfEmployment : null,
		countHelpful: typeof obj.countHelpful === "number" ? obj.countHelpful : null,
		countNotHelpful: typeof obj.countNotHelpful === "number" ? obj.countNotHelpful : null,
		location,
	};
}

// ── JSON-LD extraction (company-level) ───────────────────────────────────────

interface JsonLdCompanyData {
	name: string | null;
	rating: string | null;
	reviewCount: string | null;
	ratingCount: string | null;
}

function extractCompanyFromJsonLd(jsonLdItems: unknown[]): JsonLdCompanyData {
	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		const type = obj["@type"];

		// EmployerAggregateRating — directly contains ratingValue
		if (type === "EmployerAggregateRating" || type === "AggregateRating") {
			return {
				name: resolveNameFromJsonLd(obj),
				rating: obj.ratingValue != null ? String(obj.ratingValue) : null,
				reviewCount: obj.reviewCount != null ? String(obj.reviewCount) : null,
				ratingCount: obj.ratingCount != null ? String(obj.ratingCount) : null,
			};
		}

		// Organization with aggregateRating
		if (type === "Organization" || type === "LocalBusiness") {
			const aggRating = obj.aggregateRating as Record<string, unknown> | undefined;
			if (aggRating) {
				return {
					name: typeof obj.name === "string" ? obj.name : null,
					rating: aggRating.ratingValue != null ? String(aggRating.ratingValue) : null,
					reviewCount: aggRating.reviewCount != null ? String(aggRating.reviewCount) : null,
					ratingCount: aggRating.ratingCount != null ? String(aggRating.ratingCount) : null,
				};
			}
		}

		// FAQPage — Glassdoor often puts rating info in FAQ answers
		if (type === "FAQPage" && Array.isArray(obj.mainEntity)) {
			for (const entity of obj.mainEntity as Record<string, unknown>[]) {
				const answer = entity.acceptedAnswer as Record<string, unknown> | undefined;
				const answerText = typeof answer?.text === "string" ? answer.text : "";
				const match = answerText.match(
					/(\d+\.\d+)\s+out of\s+5\s+stars.*?based on\s+([\d,]+)\s+anonymous reviews/,
				);
				if (match) {
					return {
						name: null,
						rating: match[1] ?? null,
						reviewCount: match[2]?.replace(/,/g, "") ?? null,
						ratingCount: null,
					};
				}
			}
		}
	}

	return { name: null, rating: null, reviewCount: null, ratingCount: null };
}

function resolveNameFromJsonLd(obj: Record<string, unknown>): string | null {
	const itemReviewed = obj.itemReviewed as Record<string, unknown> | undefined;
	if (itemReviewed && typeof itemReviewed.name === "string") {
		return itemReviewed.name;
	}
	if (typeof obj.name === "string") return obj.name;
	return null;
}

// ── DOM-based review extraction ──────────────────────────────────────────────

function extractReviewsFromDom(doc: Document): BusinessReview[] {
	const reviews: BusinessReview[] = [];

	// Strategy 1: stable data-test review cards
	const reviewContainers = selectAll(
		'article[data-test="review-detail"], [data-test="employerReview"], .gdReview, #ReviewsFeed li',
		doc,
	) as unknown as Element[];

	for (const container of reviewContainers) {
		const review = extractSingleReviewFromDom(container);
		if (review) reviews.push(review);
	}

	return reviews;
}

function extractLabeledReviewText(container: Element, label: string): string | null {
	const divs = selectAll("div", container) as unknown as Element[];
	for (const div of divs) {
		const children = (div.children ?? []).filter((child): child is Element => child.type === "tag");
		if (children.length < 2) continue;

		const heading = children[0];
		const body = children[1];
		if (heading.name !== "p") continue;
		if (normalizeText(textContent(heading)) !== label) continue;

		return normalizeText(textContent(body));
	}
	return null;
}

function extractSingleReviewFromDom(container: Element): BusinessReview | null {
	const reviewLink = selectOne(
		'a[href*="/Reviews/Employee-Review-"]',
		container,
	) as Element | null;
	const summary = reviewLink ? normalizeText(textContent(reviewLink)) : null;
	const reviewHref = reviewLink ? getAttributeValue(reviewLink, "href") : null;
	const reviewId = reviewHref?.match(/RVW(\d+)/i)?.[1] ?? null;

	const pros =
		getText('[data-test="pros"]', container) ??
		extractLabeledReviewText(container, "Pros");
	const cons =
		getText('[data-test="cons"]', container) ??
		extractLabeledReviewText(container, "Cons");
	const advice =
		getText('[data-test="advice-management"]', container) ??
		extractLabeledReviewText(container, "Advice to Management");

	// Must have at least pros or cons
	if (!pros && !cons) return null;

	// Rating
	const rating =
		getText('[data-test="review-rating-label"]', container) ??
		getText('[data-test="rating"]', container);

	// Date
	let date: string | null = null;
	const dateEl = selectOne("time", container) as Element | null;
	if (dateEl) {
		date = normalizeText(getAttributeValue(dateEl, "datetime") ?? textContent(dateEl));
	}
	if (!date) {
		const textNodes = selectAll("span, div", container) as unknown as Element[];
		for (const span of textNodes) {
			const text = normalizeText(textContent(span));
			if (!text) continue;
			if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}$/i.test(text)) {
				date = text;
				break;
			}
		}
	}

	// Job title and employment status from author info
	const jobTitle =
		getText('[data-test="content-avatar-label"]', container) ??
		getText(".ContentAvatarTags_avatarLabel__Nb7Nh", container);
	let employmentStatus: string | null = null;
	let location: string | null = null;
	const tags = selectAll('[data-test="content-avatar-tag"]', container) as unknown as Element[];
	for (const tag of tags) {
		const tagText = normalizeText(textContent(tag));
		if (!tagText) continue;
		if (/^(Current|Former)\s+employee$/i.test(tagText)) {
			employmentStatus = tagText;
			continue;
		}
		if (!location && !looksLikeEmploymentMeta(tagText)) {
			location = tagText;
		}
	}

	// Helpful count
	let helpfulCount: string | null = null;
	const helpfulEl = selectOne(
		'[data-test="helpful-count"], [data-test="helpfulCount"], .HelpfulButton_button__iHc19',
		container,
	) as Element | null;
	if (helpfulEl) {
		const helpfulText = normalizeText(textContent(helpfulEl)) ?? "";
		const helpfulMatch = helpfulText.match(/(\d+)/);
		if (helpfulMatch) helpfulCount = helpfulMatch[1] ?? null;
	}

	// Build the structured body
	const body = formatReviewBody({
		summary,
		jobTitle,
		employmentStatus,
		pros,
		cons,
		advice,
		helpfulCount,
	});

	// Parse helpful count as number
	const helpfulNum = helpfulCount != null ? Number.parseInt(helpfulCount, 10) : null;

	return {
		author: jobTitle ?? null,
		rating,
		date,
		body,
		reviewId,
		title: summary ?? null,
		jobTitle: jobTitle ?? null,
		employmentStatus: employmentStatus ?? null,
		location,
		pros: pros ?? null,
		cons: cons ?? null,
		advice: advice ?? null,
		helpfulCount: helpfulNum != null && !Number.isNaN(helpfulNum) ? helpfulNum : null,
	};
}

// ── DOM company-level extraction ─────────────────────────────────────────────

interface DomCompanyInfo {
	name: string | null;
	rating: string | null;
	reviewCount: string | null;
}

function extractCompanyFromDom(doc: Document): DomCompanyInfo {
	// Company name from heading
	const name = getText('[data-test="employer-name"], h1', doc);

	// Overall rating
	let rating: string | null = null;
	const ratingEl = selectOne(
		'[data-test="rating-headline"], [data-test="rating"], [data-test="employer-rating"]',
		doc,
	) as Element | null;
	if (ratingEl) {
		const text = textContent(ratingEl).trim();
		const match = text.match(/(\d+\.\d+)/);
		if (match) rating = match[1] ?? null;
	}

	// Review count
	let reviewCount: string | null = null;
	const countEl = selectOne(
		'[data-test="review-count"], [data-test="reviewCount"], [data-test="rating-headline"]',
		doc,
	) as Element | null;
	if (countEl) {
		const text = textContent(countEl).trim();
		const match = text.match(/\(([\d,]+)\s+total reviews\)/i) ?? text.match(/([\d,]+)\s+total reviews/i);
		if (match) reviewCount = match[1]?.replace(/,/g, "") ?? null;
	}

	// Fallback: look for rating/count in page text patterns
	if (!reviewCount) {
		const allText = getText("body", doc) ?? "";
		const countMatch = allText.match(/([\d,]+)\s+reviews?/i);
		if (countMatch) reviewCount = countMatch[1]?.replace(/,/g, "") ?? null;
	}

	return { name, rating, reviewCount };
}

// ── Body formatting ──────────────────────────────────────────────────────────

interface ReviewBodyParts {
	summary: string | null;
	jobTitle: string | null;
	employmentStatus: string | null;
	pros: string | null;
	cons: string | null;
	advice: string | null;
	helpfulCount: string | null;
}

function formatReviewBody(parts: ReviewBodyParts): string {
	const lines: string[] = [];

	if (parts.summary) {
		lines.push(`**${parts.summary}**`);
	}

	if (parts.jobTitle || parts.employmentStatus) {
		const status = parts.employmentStatus
			? `${parts.employmentStatus} Employee`
			: "";
		const title = parts.jobTitle ?? "";
		if (status && title) {
			lines.push(`${status} - ${title}`);
		} else {
			lines.push(status || title);
		}
	}

	if (parts.pros) {
		lines.push(`**Pros:** ${parts.pros}`);
	}

	if (parts.cons) {
		lines.push(`**Cons:** ${parts.cons}`);
	}

	if (parts.advice) {
		lines.push(`**Advice to Management:** ${parts.advice}`);
	}

	if (parts.helpfulCount && parts.helpfulCount !== "0") {
		lines.push(`Helpful (${parts.helpfulCount})`);
	}

	return lines.join("\n\n");
}

// ── Convert Apollo reviews to BusinessReview[] ───────────────────────────────

function apolloReviewsToBusinessReviews(apolloReviews: ApolloReview[]): BusinessReview[] {
	return apolloReviews.map((r) => {
		const employmentStatus = r.isCurrentJob === true
			? "Current"
			: r.isCurrentJob === false
				? "Former"
				: r.employmentStatus === "REGULAR"
					? null
					: r.employmentStatus;

		const body = formatReviewBody({
			summary: r.summary,
			jobTitle: r.jobTitle,
			employmentStatus,
			pros: r.pros,
			cons: r.cons,
			advice: r.advice,
			helpfulCount: r.countHelpful != null ? String(r.countHelpful) : null,
		});

		// Date — extract date portion from datetime
		let date: string | null = null;
		if (r.reviewDateTime) {
			date = r.reviewDateTime.split("T")[0] ?? r.reviewDateTime;
		}

		// Sub-ratings from the 9 individual rating fields
		const subRatings: { category: string; rating: number }[] = [];
		if (r.ratingWorkLifeBalance != null) subRatings.push({ category: "Work/Life Balance", rating: r.ratingWorkLifeBalance });
		if (r.ratingCultureAndValues != null) subRatings.push({ category: "Culture & Values", rating: r.ratingCultureAndValues });
		if (r.ratingDiversityAndInclusion != null) subRatings.push({ category: "Diversity & Inclusion", rating: r.ratingDiversityAndInclusion });
		if (r.ratingSeniorLeadership != null) subRatings.push({ category: "Senior Leadership", rating: r.ratingSeniorLeadership });
		if (r.ratingCompensationAndBenefits != null) subRatings.push({ category: "Compensation & Benefits", rating: r.ratingCompensationAndBenefits });
		if (r.ratingCareerOpportunities != null) subRatings.push({ category: "Career Opportunities", rating: r.ratingCareerOpportunities });
		if (r.ratingCeo != null) subRatings.push({ category: "CEO Approval", rating: r.ratingCeo });
		if (r.ratingBusinessOutlook != null) subRatings.push({ category: "Business Outlook", rating: r.ratingBusinessOutlook });
		if (r.ratingRecommendToFriend != null) subRatings.push({ category: "Recommend to Friend", rating: r.ratingRecommendToFriend });

		return {
			author: r.jobTitle ?? null,
			rating: r.ratingOverall != null ? String(r.ratingOverall) : null,
			date,
			body,
			reviewId: r.reviewId ?? null,
			title: r.summary ?? null,
			jobTitle: r.jobTitle ?? null,
			employmentStatus: employmentStatus ?? null,
			location: r.location ?? null,
			pros: r.pros ?? null,
			cons: r.cons ?? null,
			advice: r.advice ?? null,
			lengthOfEmployment: r.lengthOfEmployment ?? null,
			helpfulCount: r.countHelpful ?? null,
			subRatings: subRatings.length > 0 ? subRatings : undefined,
		};
	});
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseGlassdoorReviews(html: string, url: string): BusinessData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");

	// Detect challenge / login wall
	if (isChallengeOrLoginWall(doc)) {
		throw new Error("Glassdoor challenge page detected — browser strategy may have failed");
	}

	// ── 1. Apollo GraphQL state (primary data source) ────────────────────────
	const apolloData = extractApolloData(doc);

	// ── 2. JSON-LD (company-level rating/review count) ───────────────────────
	const jsonLdItems = extractJsonLd(doc);
	const jsonLdCompany = extractCompanyFromJsonLd(jsonLdItems);

	// ── 3. DOM fallback (reviews + company info) ─────────────────────────────
	const domCompany = extractCompanyFromDom(doc);
	const domReviews = extractReviewsFromDom(doc);

	// ── Merge data sources ───────────────────────────────────────────────────

	// Company name
	const companyName =
		apolloData?.companyName ??
		jsonLdCompany.name ??
		domCompany.name ??
		cleanTitle(ogTitle) ??
		null;

	// Rating
	const rating =
		apolloData?.overallRating ??
		jsonLdCompany.rating ??
		domCompany.rating ??
		null;

	// Review count
	const reviewCount =
		apolloData?.reviewCount ??
		domCompany.reviewCount ??
		jsonLdCompany.reviewCount ??
		jsonLdCompany.ratingCount ??
		null;

	// Reviews — prefer Apollo (richer), then DOM
	const reviews: BusinessReview[] =
		apolloData && apolloData.reviews.length > 0
			? apolloReviewsToBusinessReviews(apolloData.reviews)
			: domReviews;

	// Description — build from available meta
	let description: string | null = null;
	if (companyName && rating) {
		const parts: string[] = [`${rating}/5`];
		if (reviewCount) parts.push(`${reviewCount} reviews`);
		if (apolloData?.ceoApproval) parts.push(`CEO approval: ${apolloData.ceoApproval}%`);
		if (apolloData?.recommendToFriend) parts.push(`${apolloData.recommendToFriend}% recommend`);
		description = `${companyName}: ${parts.join(" | ")}`;
	} else {
		description = ogDesc ?? null;
	}

	if (!companyName && !description && reviews.length === 0) {
		throw new Error("No Glassdoor reviews content found");
	}

	// Clean title — remove " Reviews | Glassdoor" or similar suffix
	const title = (companyName ?? ogTitle ?? pageTitle ?? "")
		.replace(/\s*Reviews?\s*[-|]\s*Glassdoor$/i, "")
		.replace(/\s*[-|]\s*Glassdoor$/i, "")
		.trim() || null;

	return {
		type: "business",
		title: title ? `${title} Reviews` : ogTitle ?? pageTitle,
		url,
		name: companyName,
		rating,
		reviewCount,
		categories: ["Employer Reviews"],
		description,
		reviews,
		businessId: new URL(url).pathname.match(/E(\d+)\.htm/i)?.[1] ?? null,
	};
}

// ── Utility ──────────────────────────────────────────────────────────────────

function cleanTitle(title: string | null): string | null {
	if (!title) return null;
	return title
		.replace(/\s*Reviews?\s*[-|]\s*Glassdoor$/i, "")
		.replace(/\s*[-|]\s*Glassdoor$/i, "")
		.replace(/\s*Reviews?\s*\([\d,]+\):?\s*/i, "")
		.replace(/\s*Reviews?$/i, "")
		.trim() || null;
}
