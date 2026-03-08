import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type {
	CompanyCultureBlock,
	CompanyData,
	CompanyEmployee,
	CompanyJobListing,
	CompanyPost,
	JobPostingData,
	PersonProfileData,
	ProfileArticle,
	ProfileEducation,
	ProfileExperience,
	SimilarPage,
	SocialComment,
	SocialData,
} from "./page-data";

function getMetaName(doc: Document, name: string): string | null {
	const el = selectOne(`meta[name="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function extractJsonLd(doc: Document): unknown[] {
	const scripts = selectAll('script[type="application/ld+json"]', doc) as unknown as Element[];
	const results: unknown[] = [];
	for (const script of scripts) {
		const raw = textContent(script).trim();
		if (!raw) continue;
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) results.push(...parsed);
			else results.push(parsed);
		} catch {
			// Ignore
		}
	}
	return results;
}

function findItemsOfType(items: unknown[], type: string): Array<Record<string, unknown>> {
	const found: Array<Record<string, unknown>> = [];
	for (const item of items) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] === type) found.push(obj);
		if (Array.isArray(obj["@graph"])) {
			found.push(...findItemsOfType(obj["@graph"] as unknown[], type));
		}
	}
	return found;
}

function stringVal(val: unknown): string | null {
	return typeof val === "string" && val.trim() ? val.trim() : null;
}

/** Clean up textContent whitespace */
function cleanText(t: string): string {
	return t.replace(/\s+/g, " ").trim();
}

/** Format a date range from start/end values from JSON-LD */
function formatDateRange(startDate: unknown, endDate: unknown): string | null {
	const start = startDate != null ? String(startDate) : null;
	const end = endDate != null ? String(endDate) : null;
	if (!start && !end) return null;
	if (start && end) return `${start} – ${end}`;
	if (start) return `${start} – Present`;
	return null;
}

/** Extract follower count from interactionStatistic */
function extractFollowerCount(stats: unknown): number | null {
	const arr: unknown[] = Array.isArray(stats) ? stats : stats ? [stats] : [];
	for (const stat of arr) {
		const s = stat as Record<string, unknown>;
		if (
			(s.interactionType === "https://schema.org/FollowAction" ||
				s.interactionType === "http://schema.org/FollowAction") &&
			typeof s.userInteractionCount === "number"
		) {
			return s.userInteractionCount as number;
		}
	}
	return null;
}

function extractInteractionCount(
	stats: unknown,
	pattern: RegExp,
): number | null {
	const arr: unknown[] = Array.isArray(stats) ? stats : stats ? [stats] : [];
	for (const stat of arr) {
		const s = stat as Record<string, unknown>;
		const interactionType = stringVal(s.interactionType);
		if (!interactionType || !pattern.test(interactionType)) continue;
		const count = s.userInteractionCount;
		if (typeof count === "number") return count;
		if (typeof count === "string" && count.trim()) {
			const parsed = Number(count);
			if (Number.isFinite(parsed)) return parsed;
		}
	}
	return null;
}

/** Format a raw follower count into a human-readable string */
function formatFollowers(count: number | null): string | null {
	if (count === null) return null;
	return count.toLocaleString() + " followers";
}

// ── Company page extraction ────────────────────────────────────────────────

function extractCompanyFromDom(doc: Document): Partial<CompanyData> {
	const partial: Partial<CompanyData> = {};

	// Tagline from top-card second subline (visible one-liner under company name)
	const taglineEl = selectOne("h4.top-card-layout__second-subline", doc) as Element | null;
	if (taglineEl) partial.tagline = cleanText(textContent(taglineEl)) || null;

	// Industry
	const industryEl = selectOne('[data-test-id="about-us__industry"] dd', doc) as Element | null;
	if (industryEl) partial.industry = cleanText(textContent(industryEl)) || null;

	// Employee count
	const sizeEl = selectOne('[data-test-id="about-us__size"] dd', doc) as Element | null;
	if (sizeEl) partial.employeeCount = cleanText(textContent(sizeEl)) || null;

	// Company type
	const typeEl = selectOne('[data-test-id="about-us__organizationType"] dd', doc) as Element | null;
	if (typeEl) partial.companyType = cleanText(textContent(typeEl)) || null;

	// Website
	const websiteEl = selectOne('[data-test-id="about-us__website"] a', doc) as Element | null;
	if (websiteEl) {
		// LinkedIn wraps URLs in a redirect — prefer the link text (the actual URL)
		const websiteText = cleanText(textContent(websiteEl));
		if (websiteText && websiteText.startsWith("http")) {
			partial.website = websiteText;
		}
	}

	// Headquarters (when present, usually as a separate field)
	const hqEl = selectOne('[data-test-id="about-us__headquarters"] dd', doc) as Element | null;
	if (hqEl) partial.headquarters = cleanText(textContent(hqEl)) || null;

	// Founded
	const foundedEl = selectOne('[data-test-id="about-us__foundedOn"] dd', doc) as Element | null;
	if (foundedEl) partial.founded = cleanText(textContent(foundedEl)) || null;

	// Specialties
	const specialtiesEl = selectOne('[data-test-id="about-us__specialties"] dd', doc) as Element | null;
	if (specialtiesEl) {
		const raw = cleanText(textContent(specialtiesEl));
		if (raw) partial.specialties = raw.split(",").map((s) => s.trim()).filter(Boolean);
	}

	return partial;
}

/**
 * Extract feed posts from DOM feed cards using per-card container approach.
 * Each feed card is wrapped in article[data-id="main-feed-card"].
 * For reshares, combines outer commentary with the reshared post's text.
 * datePublished is augmented from JSON-LD DiscussionForumPosting items by text-prefix matching.
 */
function extractPostsFromDom(doc: Document, jsonLdPosts: Array<Record<string, unknown>>): CompanyPost[] {
	const cards = selectAll('article[data-id="main-feed-card"]', doc) as unknown as Element[];
	if (cards.length === 0) return [];

	// Build a map of JSON-LD posts keyed by first 60 chars of text for date lookup
	const jsonLdByPrefix = new Map<string, Record<string, unknown>>();
	for (const p of jsonLdPosts) {
		const t = stringVal(p.text);
		if (t) jsonLdByPrefix.set(t.slice(0, 60), p);
	}

	const posts: CompanyPost[] = [];
	for (const card of cards) {
		// Outer post commentary (the card author's own text)
		const commentaryEl = selectOne('[data-test-id="main-feed-activity-card__commentary"]', card) as Element | null;
		const outerText = commentaryEl ? cleanText(textContent(commentaryEl)) : "";

		// Reshared post's own text (when this card is a reshare)
		const reshareCommentaryEl = selectOne('[data-test-id="feed-reshare-content__commentary"]', card) as Element | null;
		const resharedText = reshareCommentaryEl ? cleanText(textContent(reshareCommentaryEl)) : "";

		const text = outerText;
		const resharedTextVal = resharedText || null;

		// Skip cards with no extractable text at all
		if (!text && !resharedTextVal) continue;

		// URL from semaphore URN: urn:li:activity:ID → /feed/update/urn:li:activity:ID/
		const semaphoreEl = selectOne('a[data-semaphore-content-type="POST"]', card) as Element | null;
		const urn = semaphoreEl ? (getAttributeValue(semaphoreEl, "data-semaphore-content-urn") ?? null) : null;
		const postUrl = urn ? `https://www.linkedin.com/feed/update/${urn}/` : null;

		// Reactions and comments from data-* attributes
		const reactionEl = selectOne('[data-test-id="social-actions__reactions"]', card) as Element | null;
		const reactions = reactionEl ? (getAttributeValue(reactionEl, "data-num-reactions") ?? null) : null;
		const commentEl = selectOne('[data-test-id="social-actions__comments"]', card) as Element | null;
		const comments = commentEl ? (getAttributeValue(commentEl, "data-num-comments") ?? null) : null;

		// Article headline (optional, when post links to an article)
		const articleTitleEl = selectOne('[data-test-id="article-content__title"]', card) as Element | null;
		const headline = articleTitleEl ? cleanText(textContent(articleTitleEl)) || null : null;

		// Date from JSON-LD by text prefix match (use outer text key first, fallback to reshared)
		const matchKey = (outerText || resharedText).slice(0, 60);
		const jsonLdMatch = jsonLdByPrefix.get(matchKey);
		const datePublished = jsonLdMatch ? stringVal(jsonLdMatch.datePublished) : null;

		posts.push({ text, resharedText: resharedTextVal, headline, url: postUrl, datePublished, reactions, comments });
	}

	return posts;
}

/** Extract visible employees from the "Employees at <Company>" section */
function extractEmployeesFromDom(doc: Document): CompanyEmployee[] {
	const section = selectOne('[data-test-id="employees-at"]', doc) as Element | null;
	if (!section) return [];
	const links = selectAll('a[data-tracking-control-name="org-employees"]', section) as unknown as Element[];
	return links
		.map((a) => {
			const nameEl = selectOne("h3", a) as Element | null;
			const name = nameEl ? cleanText(textContent(nameEl)) : cleanText(textContent(a));
			const profileUrl = getAttributeValue(a, "href") ?? null;
			return { name, profileUrl };
		})
		.filter((e) => e.name.length > 0);
}

/** Extract similar / related company pages from the sidebar */
function extractSimilarPagesFromDom(doc: Document): SimilarPage[] {
	const section = selectOne('[data-test-id="similar-pages"]', doc) as Element | null;
	if (!section) return [];
	const links = selectAll('a[data-tracking-control-name="similar-pages"]', section) as unknown as Element[];
	return links
		.map((a) => {
			const nameEl = selectOne("h3", a) as Element | null;
			const descEl = selectOne("p", a) as Element | null;
			const name = nameEl ? cleanText(textContent(nameEl)) : "";
			const description = descEl ? cleanText(textContent(descEl)) || null : null;
			const url = getAttributeValue(a, "href") ?? null;
			return { name, description, url };
		})
		.filter((p) => p.name.length > 0);
}

// ── Person page extraction ─────────────────────────────────────────────────

function extractExperienceFromJsonLd(person: Record<string, unknown>): ProfileExperience[] {
	const results: ProfileExperience[] = [];

	// jobTitle can be a string or array — these map positionally to worksFor[]
	const jobTitleRaw = person.jobTitle;
	const jobTitles: string[] = Array.isArray(jobTitleRaw)
		? (jobTitleRaw as unknown[]).map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean)
		: typeof jobTitleRaw === "string" && jobTitleRaw.trim()
			? [jobTitleRaw.trim()]
			: [];

	// worksFor = current positions; zip with jobTitle[] by index for role titles
	const worksFor = person.worksFor as unknown[] | undefined;
	if (Array.isArray(worksFor)) {
		for (let i = 0; i < worksFor.length; i++) {
			const org = worksFor[i] as Record<string, unknown>;
			if (!org || typeof org !== "object") continue;
			const company = stringVal(org.name) ?? "";
			const member = org.member as Record<string, unknown> | undefined;
			const dateRange = member ? formatDateRange(member.startDate, member.endDate) : null;
			// Assign job title by position — only when counts match or within bounds
			const role = jobTitles[i] ?? "";
			results.push({ role, company, dateRange });
		}
	}

	// alumniOf = past positions (Organization type only; EducationalOrganization → education)
	// No role title available in JSON-LD for past positions
	const alumniOf = person.alumniOf as unknown[] | undefined;
	if (Array.isArray(alumniOf)) {
		for (const item of alumniOf) {
			const org = item as Record<string, unknown>;
			if (!org || typeof org !== "object") continue;
			if (org["@type"] !== "Organization") continue;
			const company = stringVal(org.name) ?? "";
			const member = org.member as Record<string, unknown> | undefined;
			const dateRange = member ? formatDateRange(member.startDate, member.endDate) : null;
			results.push({ role: "", company, dateRange });
		}
	}

	return results;
}

function extractEducationFromJsonLd(person: Record<string, unknown>): ProfileEducation[] {
	const results: ProfileEducation[] = [];
	const alumniOf = person.alumniOf as unknown[] | undefined;
	if (!Array.isArray(alumniOf)) return results;

	for (const item of alumniOf) {
		const org = item as Record<string, unknown>;
		if (!org || typeof org !== "object") continue;
		if (org["@type"] !== "EducationalOrganization") continue;
		const school = stringVal(org.name);
		if (!school) continue;
		const member = org.member as Record<string, unknown> | undefined;
		const dateRange = member ? formatDateRange(member.startDate, member.endDate) : null;
		// Degree is stored in the member's description or roleName field
		const degree = member
			? (stringVal(member.description) ?? stringVal(member.roleName))
			: null;
		results.push({ school, degree, dateRange });
	}

	return results;
}

/**
 * Extract education from DOM education__list items.
 * Each li contains h3 (school name) and h4 (degree · field of study).
 * JSON-LD alumniOf often misses schools and never includes degree info.
 */
function extractEducationFromDom(doc: Document): ProfileEducation[] {
	const listItems = selectAll("ul.education__list li", doc) as unknown as Element[];
	if (listItems.length === 0) return [];

	const results: ProfileEducation[] = [];
	for (const li of listItems) {
		const h3El = selectOne("h3", li) as Element | null;
		const school = h3El ? cleanText(textContent(h3El)) : "";
		if (!school) continue;

		// h4 contains degree and field of study as separate spans
		const h4El = selectOne("h4", li) as Element | null;
		let degree: string | null = null;
		if (h4El) {
			const spans = selectAll("span", h4El) as unknown as Element[];
			const parts: string[] = [];
			for (const span of spans) {
				const t = cleanText(textContent(span));
				if (t && t !== "-") parts.push(t);
			}
			// Deduplicate (nested spans can repeat text)
			const unique = [...new Set(parts)];
			if (unique.length > 0) degree = unique.join(", ");
		}

		// Date range from spans after h4 (text-low-emphasis spans with years)
		const allSpans = selectAll("span", li) as unknown as Element[];
		let dateRange: string | null = null;
		for (const span of allSpans) {
			const t = cleanText(textContent(span));
			// Match date ranges like "1994 – 1996" or "2020 - Present"
			if (/^\d{4}\s*[-–]\s*(\d{4}|Present)$/i.test(t)) {
				dateRange = t;
				break;
			}
		}

		results.push({ school, degree, dateRange });
	}
	return results;
}

function extractArticlesFromDom(doc: Document): ProfileArticle[] {
	const cards = selectAll("div.main-article-card", doc) as unknown as Element[];
	const results: ProfileArticle[] = [];
	for (const card of cards) {
		const titleEl = selectOne("h3.base-main-card__title", card) as Element | null;
		const title = titleEl ? cleanText(textContent(titleEl)) : null;
		if (!title) continue;
		const urlEl = selectOne("a.base-card__full-link", card) as Element | null;
		const url = urlEl ? (getAttributeValue(urlEl, "href") ?? null) : null;
		const dateEl = selectOne("span.base-main-card__metadata-item", card) as Element | null;
		const date = dateEl ? cleanText(textContent(dateEl)) : null;
		const snippetEl = selectOne("p.base-main-card__description", card) as Element | null;
		const snippet = snippetEl ? cleanText(textContent(snippetEl)) : null;
		const reactionsEl = selectOne('[data-test-id="social-actions__reactions"]', card) as Element | null;
		const reactionsRaw = reactionsEl ? (getAttributeValue(reactionsEl, "data-num-reactions") ?? null) : null;
		const reactions = reactionsRaw ? Number(reactionsRaw).toLocaleString() : null;
		const commentsEl = selectOne('[data-test-id="social-actions__comments"]', card) as Element | null;
		const commentsRaw = commentsEl ? (getAttributeValue(commentsEl, "data-num-comments") ?? null) : null;
		const comments = commentsRaw ? Number(commentsRaw).toLocaleString() : null;
		results.push({ title, url, date, snippet, reactions, comments });
	}
	return results;
}

// ── Jobs sub-page extraction ─────────────────────────────────────────────────

function extractJobListingsFromDom(doc: Document): CompanyJobListing[] {
	const cards = selectAll("div.main-job-card", doc) as unknown as Element[];
	const jobs: CompanyJobListing[] = [];
	for (const card of cards) {
		const titleEl = selectOne("h3.base-main-card__title", card) as Element | null;
		const jobTitle = titleEl ? cleanText(textContent(titleEl)) : "";
		if (!jobTitle) continue;

		const locationEl = selectOne("span.main-job-card__location", card) as Element | null;
		const location = locationEl ? cleanText(textContent(locationEl)) || null : null;

		const salaryEl = selectOne("span.main-job-card__salary-info", card) as Element | null;
		const salary = salaryEl ? cleanText(textContent(salaryEl)) || null : null;

		const timeEl = selectOne("time", card) as Element | null;
		const datePosted = timeEl
			? (getAttributeValue(timeEl, "datetime") ?? (cleanText(textContent(timeEl)) || null))
			: null;

		const linkEl = selectOne("a.base-card__full-link", card) as Element | null;
		const jobUrl = linkEl ? (getAttributeValue(linkEl, "href") ?? null) : null;

		jobs.push({ jobTitle, location, salary, datePosted, jobUrl });
	}
	return jobs;
}

// ── Life sub-page extraction ─────────────────────────────────────────────────

function extractCultureBlocks(doc: Document): CompanyCultureBlock[] {
	const sections = selectAll('[data-test-id="additional-media"]', doc) as unknown as Element[];
	const blocks: CompanyCultureBlock[] = [];
	for (const section of sections) {
		const headingEl = selectOne("h3.section-title", section) as Element | null;
		const heading = headingEl ? cleanText(textContent(headingEl)) : "";
		if (!heading) continue;

		const bodyEl = selectOne("p.whitespace-pre-wrap", section) as Element | null;
		const body = bodyEl ? cleanText(textContent(bodyEl)) : "";

		const linkEl = selectOne("a[href]", section) as Element | null;
		const linkUrl = linkEl ? (getAttributeValue(linkEl, "href") ?? null) : null;

		blocks.push({ heading, body, linkUrl });
	}
	return blocks;
}

function extractCompanyPhotos(doc: Document): string[] {
	const imgs = selectAll("section.slide-list img", doc) as unknown as Element[];
	const urls: string[] = [];
	for (const img of imgs) {
		const src = getAttributeValue(img, "data-delayed-url") ?? getAttributeValue(img, "src");
		if (src && src.startsWith("http")) urls.push(src);
	}
	return urls;
}

function parseLinkedInPostPage(
	doc: Document,
	url: string,
	pageTitle: string | null,
	ogTitle: string | null,
	ogDesc: string | null,
): SocialData {
	const jsonLdItems = extractJsonLd(doc);
	const post = findItemsOfType(jsonLdItems, "SocialMediaPosting")[0] ?? null;

	if (!post) {
		throw new Error("No LinkedIn post content found");
	}

	const authorObj = post.author as Record<string, unknown> | undefined;
	const authorName = stringVal(authorObj?.name);
	const authorImageObj = authorObj?.image as Record<string, unknown> | undefined;
	const authorImageUrl = stringVal(authorImageObj?.url) ?? stringVal(authorObj?.image);

	const headline = stringVal(post.headline);
	const body = stringVal(post.articleBody) ?? stringVal(post.text) ?? headline;
	const likeCount = extractInteractionCount(post.interactionStatistic, /LikeAction$/i);
	const commentCount =
		(typeof post.commentCount === "number" ? post.commentCount : null) ??
		extractInteractionCount(post.interactionStatistic, /CommentAction$/i);

	const sharedContent = post.sharedContent as Record<string, unknown> | undefined;
	const sharedAuthor = sharedContent?.author as Record<string, unknown> | undefined;
	const sharedText = stringVal(sharedContent?.headline) ?? stringVal(sharedContent?.description);
	const sharedUrl = stringVal(sharedContent?.url);
	const quotedPost =
		sharedText || sharedAuthor
			? {
				author: stringVal(sharedAuthor?.name),
				text: sharedText ?? "",
				url: sharedUrl,
			}
			: null;

	const rawComments = Array.isArray(post.comment) ? (post.comment as Record<string, unknown>[]) : [];
	const comments: SocialComment[] = [];
	for (const comment of rawComments) {
		const commentAuthor = comment.author as Record<string, unknown> | undefined;
		const body = stringVal(comment.text);
		if (!body) continue;
		const likes = extractInteractionCount(comment.interactionStatistic, /LikeAction$/i);
		comments.push({
			author: stringVal(commentAuthor?.name),
			score: likes !== null ? likes.toLocaleString() : null,
			date: stringVal(comment.datePublished),
			body,
		});
	}

	if (!headline && !body && !authorName) {
		throw new Error("No LinkedIn post content found");
	}

	return {
		type: "social",
		title: headline ?? body ?? ogTitle ?? pageTitle ?? "LinkedIn post",
		url,
		platform: "linkedin",
		sectionTitle: authorName,
		description: ogDesc ?? null,
		post: {
			title: headline ?? body ?? ogTitle ?? pageTitle ?? "LinkedIn post",
			url,
			body: body ?? null,
			author: authorName,
			commentCount: commentCount !== null ? commentCount.toLocaleString() : null,
			date: stringVal(post.datePublished),
			likeCount: likeCount !== null ? likeCount.toLocaleString() : null,
			quotedPost,
		},
		comments,
		profileImageUrl: authorImageUrl,
	};
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseLinkedIn(
	html: string,
	url: string,
): CompanyData | PersonProfileData | JobPostingData | SocialData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");

	const parsedUrl = new URL(url);
	const pathname = parsedUrl.pathname;

	// ── Person profile page (/in/) ─────────────────────────────────────────
	if (pathname.startsWith("/in/")) {
		const jsonLdItems = extractJsonLd(doc);
		const personItems = findItemsOfType(jsonLdItems, "Person");
		const person = personItems[0] ?? null;

		let name: string | null = null;
		let headline: string | null = null;
		let location: string | null = null;
		let bio: string | null = null;
		let followers: string | null = null;
		let connections: string | null = null;
		let experience: ProfileExperience[] = [];
		let education: ProfileEducation[] = [];

		if (person) {
			name = stringVal(person.name);

			// jobTitle is a string or array of current titles; join for headline
			const jobTitleRaw = person.jobTitle;
			if (Array.isArray(jobTitleRaw)) {
				const titles = (jobTitleRaw as unknown[]).map((t) => (typeof t === "string" ? t.trim() : null)).filter(Boolean);
				if (titles.length > 0) headline = titles.join(", ");
			} else {
				headline = stringVal(jobTitleRaw);
			}

			// Location
			const address = person.address as Record<string, unknown> | undefined;
			if (address) {
				location =
					stringVal(address.addressLocality) ??
					stringVal(address.addressRegion) ??
					stringVal(address.addressCountry);
			}

			bio = stringVal(person.description);
			const followerCount = extractFollowerCount(person.interactionStatistic);
			followers = formatFollowers(followerCount);

			experience = extractExperienceFromJsonLd(person);
			education = extractEducationFromJsonLd(person);
		}

		// DOM education has degree/field info that JSON-LD lacks — prefer it when available
		const domEducation = extractEducationFromDom(doc);
		if (domEducation.length > 0) {
			// Merge dates from JSON-LD into DOM results (DOM often lacks dates)
			const jsonLdBySchool = new Map<string, ProfileEducation>();
			for (const e of education) {
				if (e.school) jsonLdBySchool.set(e.school.toLowerCase(), e);
			}
			for (const de of domEducation) {
				if (!de.dateRange) {
					const match = jsonLdBySchool.get(de.school.toLowerCase());
					if (match?.dateRange) de.dateRange = match.dateRange;
				}
			}
			education = domEducation;
		}

		// Headline fallback from og:title: "Name - Headline | LinkedIn"
		if (!headline && ogTitle) {
			const match = ogTitle.match(/^[^-]+-\s*(.+?)\s*\|\s*LinkedIn$/);
			if (match?.[1]) headline = match[1];
		}

		// Name fallback
		if (!name && ogTitle) {
			name = ogTitle.split(" | ")[0]?.split(" - ")[0]?.trim() ?? null;
		}

		// Connections from meta[name="description"]: "... · 500+ connections on LinkedIn."
		const metaDesc = getMetaName(doc, "description");
		if (metaDesc) {
			const m = metaDesc.match(/(\d[\d,]+\+?)\s+connections/i);
			if (m) connections = m[1] + " connections";
		}

		// Posts from DiscussionForumPosting JSON-LD items (person activity feed)
		const postItems = findItemsOfType(jsonLdItems, "DiscussionForumPosting");
		const posts: CompanyPost[] = postItems
			.map((item) => {
				const likesStat = item.interactionStatistic as Record<string, unknown> | undefined;
				const reactions =
					typeof likesStat?.userInteractionCount === "number"
						? String(likesStat.userInteractionCount)
						: null;
				return {
					text: stringVal(item.text) ?? "",
					resharedText: null,
					headline: stringVal(item.headline) || null,
					url: stringVal(item.url),
					datePublished: stringVal(item.datePublished),
					reactions,
					comments: null,
				};
			})
			.filter((p) => p.text.length > 0);

		// Articles: try JSON-LD Article items first (reliable), fall back to DOM
		const jsonLdArticles = findItemsOfType(jsonLdItems, "Article")
			.filter((a) => stringVal(a.headline) !== null)
			.map((a) => {
				const likesStat = a.interactionStatistic as Record<string, unknown> | undefined;
				const likes = typeof likesStat?.userInteractionCount === "number"
					? likesStat.userInteractionCount.toLocaleString()
					: null;
				const rawDate = stringVal(a.datePublished);
				const date = rawDate ? (rawDate.split("T")[0] ?? null) : null;
				return {
					title: stringVal(a.headline) ?? "",
					url: stringVal(a.url),
					date,
					snippet: null as string | null,
					reactions: likes,
					comments: null as string | null,
				};
			});

		// DOM articles have snippet + comment counts — use if available, else fall back to JSON-LD
		const domArticles = extractArticlesFromDom(doc);
		const articles = domArticles.length > 0 ? domArticles : jsonLdArticles;

		if (!name && !headline && experience.length === 0 && !ogDesc) {
			throw new Error("No LinkedIn content found");
		}

		// Profile ID from URL slug
		const profileSlug = pathname.replace(/^\/in\//, "").replace(/\/$/, "");
		const profileId = profileSlug || null;

		return {
			type: "person",
			title: ogTitle || pageTitle,
			url,
			platform: "linkedin",
			name,
			headline,
			location,
			bio: bio ?? ogDesc,
			followers,
			connections,
			experience,
			education,
			articles,
			posts,
			profileId,
		};
	}

	// ── Job listing page (/jobs/view/) ────────────────────────────────────────
	if (pathname.startsWith("/jobs/view/")) {
		const jsonLdItems = extractJsonLd(doc);
		const jobPostings = findItemsOfType(jsonLdItems, "JobPosting");
		const job = jobPostings[0];

		// Job ID from URL
		const jobIdMatch = pathname.match(/\/jobs\/view\/(\d+)/);
		const jobId = jobIdMatch?.[1] ?? null;

		if (job) {
			const jobTitle = stringVal(job.title) ?? stringVal(job.name);
			const hiringOrg = job.hiringOrganization as Record<string, unknown> | undefined;
			const company = stringVal(hiringOrg?.name);
			const jobLoc = job.jobLocation as Record<string, unknown> | undefined;
			const locAddress = jobLoc?.address as Record<string, unknown> | undefined;
			const location =
				locAddress
					? (stringVal(locAddress.addressLocality) ?? stringVal(locAddress.addressRegion))
					: stringVal(job.jobLocationType as unknown);
			const salary = extractSalaryFromJsonLd(job);
			const employmentType = stringVal(job.employmentType);
			const datePosted = stringVal(job.datePosted);
			const desc = stringVal(job.description);
			const description = desc ? desc.slice(0, 3000) : null;
			const applyUrl = stringVal(job.url) ?? null;

			// Seniority level from JSON-LD or DOM
			let seniorityLevel: string | null = stringVal(job.experienceRequirements as unknown);
			if (!seniorityLevel) {
				const criteriaEls = selectAll("li.description__job-criteria-item", doc) as unknown as Element[];
				for (const li of criteriaEls) {
					const label = selectOne("h3", li) as Element | null;
					if (label && textContent(label).trim().toLowerCase().includes("seniority level")) {
						const value = selectOne("span", li) as Element | null;
						if (value) seniorityLevel = cleanText(textContent(value)) || null;
					}
				}
			}

			if (!jobTitle && !company) {
				if (!ogDesc) throw new Error("No LinkedIn content found");
			}

			return {
				type: "job",
				title: jobTitle || ogTitle || pageTitle,
				url,
				platform: "linkedin",
				jobTitle,
				company,
				location,
				salary,
				employmentType,
				datePosted,
				description,
				applyUrl,
				jobId,
				seniorityLevel,
			};
		}

		// DOM fallback
		const h1El = selectOne("h1", doc) as Element | null;
		const jobTitle = h1El ? cleanText(textContent(h1El)) || null : null;
		if (!jobTitle && !ogTitle && !ogDesc) {
			throw new Error("No LinkedIn content found");
		}

		return {
			type: "job",
			title: jobTitle || ogTitle || pageTitle,
			url,
			platform: "linkedin",
			jobTitle: jobTitle || ogTitle,
			company: null,
			location: null,
			salary: null,
			employmentType: null,
			datePosted: null,
			description: ogDesc,
			applyUrl: null,
			jobId,
		};
	}

	// ── Public post page (/posts/ or /feed/update/) ───────────────────────────
	if (pathname.startsWith("/posts/") || pathname.startsWith("/feed/update/")) {
		return parseLinkedInPostPage(doc, url, pageTitle, ogTitle, ogDesc);
	}

	// ── Company page (/company/) ──────────────────────────────────────────────
	if (pathname.startsWith("/company/")) {
		// Detect login walls — LinkedIn gates /about, /posts, /people for guests.
		// The page title becomes "LinkedIn Login, Sign in | LinkedIn" with a checkpoint pageKey.
		if (ogTitle?.includes("LinkedIn Login") || pageTitle?.includes("LinkedIn Login")) {
			throw new Error("LinkedIn login wall — page requires authentication");
		}

		// Determine sub-page type from pathname
		const companySlug = pathname.replace(/^\/company\//, "").replace(/\/$/, "");
		const subPage = companySlug.includes("/") ? companySlug.split("/").pop() : null;

		const jsonLdItems = extractJsonLd(doc);
		const orgs = findItemsOfType(jsonLdItems, "Organization");
		const org = orgs[0];

		// DOM augmentation always runs
		const domFields = extractCompanyFromDom(doc);

		let name: string | null = null;
		let tagline: string | null = null;
		let description: string | null = null;
		let followers: string | null = null;
		let industry: string | null = null;
		let employeeCount: string | null = null;
		let companyType: string | null = null;
		let headquarters: string | null = null;
		let website: string | null = null;
		let founded: string | null = null;

		if (org) {
			name = stringVal(org.name);

			// Tagline: LinkedIn uses `slogan` in JSON-LD
			tagline = stringVal(org.slogan);

			description = stringVal(org.description);

			// Followers from interactionStatistic (may be absent for company pages)
			const followerCount = extractFollowerCount(org.interactionStatistic);
			followers = formatFollowers(followerCount);

			// numberOfEmployees: can be QuantitativeValue { value, @type }
			const empRaw = org.numberOfEmployees;
			if (empRaw && typeof empRaw === "object") {
				const emp = empRaw as Record<string, unknown>;
				const val = emp.value;
				if (val != null) employeeCount = String(val);
			} else {
				employeeCount = stringVal(empRaw);
			}

			// Website: sameAs on LinkedIn is often the external website
			const sameAs = org.sameAs;
			if (typeof sameAs === "string" && sameAs.startsWith("http") && !sameAs.includes("linkedin.com")) {
				website = sameAs;
			} else if (Array.isArray(sameAs)) {
				for (const s of sameAs) {
					if (typeof s === "string" && s.startsWith("http") && !s.includes("linkedin.com")) {
						website = s;
						break;
					}
				}
			}
		}

		// Logo URL from JSON-LD
		let logoUrl: string | null = null;
		if (org) {
			const logo = org.logo as Record<string, unknown> | undefined;
			logoUrl = logo ? stringVal(logo.contentUrl) : null;
		}

		// Followers fallback: LinkedIn company pages embed follower count in
		// meta[name="description"] as "CompanyName | N followers on LinkedIn. ..."
		if (!followers) {
			const metaDesc = getMetaName(doc, "description");
			if (metaDesc) {
				const m = metaDesc.match(/(\d[\d,]+)\s+followers?/i);
				if (m) followers = `${m[1]} followers`;
			}
		}

		// DOM takes precedence / fills gaps
		if (domFields.industry) industry = domFields.industry;
		if (domFields.employeeCount) employeeCount = domFields.employeeCount;
		if (domFields.companyType) companyType = domFields.companyType;
		if (domFields.website) website = domFields.website;
		if (domFields.headquarters) headquarters = domFields.headquarters;
		if (domFields.founded) founded = domFields.founded;

		// Tagline fallback: DOM second-subline → meta description pattern
		// Meta description format: "Company | N followers on LinkedIn. TAGLINE | Description..."
		if (!tagline && domFields.tagline) tagline = domFields.tagline;
		if (!tagline) {
			const metaDesc = getMetaName(doc, "description");
			if (metaDesc) {
				const m = metaDesc.match(/followers?\s+on\s+LinkedIn\.\s*(.+?)\s*\|/i);
				if (m?.[1]) tagline = m[1].trim() || null;
			}
		}

		// Founded fallback: JSON-LD foundingDate (schema.org standard, defensive)
		if (!founded && org) {
			const fd = stringVal(org.foundingDate);
			if (fd) founded = fd;
		}

		// Rating / review count from JSON-LD aggregateRating (not common on LinkedIn,
		// but defensive for future or third-party enrichment)
		let rating: string | null = null;
		let reviewCount: string | null = null;
		if (org?.aggregateRating) {
			const ar = org.aggregateRating as Record<string, unknown>;
			const rv = ar.ratingValue;
			if (rv != null) rating = String(rv);
			const rc = ar.reviewCount ?? ar.ratingCount;
			if (rc != null) reviewCount = String(rc);
		}

		// Name fallback — strip sub-page suffix like ": Jobs", ": Life" from og:title
		if (!name && ogTitle) {
			let candidate = ogTitle.split(" | ")[0]?.trim() ?? null;
			if (candidate) candidate = candidate.replace(/:\s*(Jobs|Life|About|Posts|People)$/i, "").trim();
			name = candidate || null;
		}

		// Description fallback from og:description, stripping the
		// "CompanyName | N followers on LinkedIn. " prefix LinkedIn adds
		if (!description && ogDesc) {
			const stripped = ogDesc.replace(/^[^|]+\|\s*[\d,]+\s+followers?\s+on\s+LinkedIn\.?\s*/i, "").trim();
			description = stripped || ogDesc;
		}

		// Posts: DOM-first (more posts, includes reshares + reactions + comments)
		// JSON-LD DiscussionForumPosting items used for date augmentation by text-prefix match
		const jsonLdPostItems = findItemsOfType(jsonLdItems, "DiscussionForumPosting");
		const posts = extractPostsFromDom(doc, jsonLdPostItems);

		// Fallback to JSON-LD only if DOM extraction found nothing
		const finalPosts: CompanyPost[] = posts.length > 0
			? posts
			: jsonLdPostItems
				.map((item) => ({
					text: stringVal(item.text) ?? "",
					resharedText: null,
					headline: stringVal(item.headline) || null,
					url: stringVal(item.url),
					datePublished: stringVal(item.datePublished),
					reactions: null,
					comments: null,
				}))
				.filter((p) => p.text.length > 0);

		const employees = extractEmployeesFromDom(doc);
		const similarPages = extractSimilarPagesFromDom(doc);

		// Sub-page specific extraction
		const jobListings = subPage === "jobs" ? extractJobListingsFromDom(doc) : undefined;
		const cultureBlocks = subPage === "life" ? extractCultureBlocks(doc) : undefined;
		const companyPhotos = subPage === "life" ? extractCompanyPhotos(doc) : undefined;

		// Company ID from URL slug (companySlug may include sub-path like "google/jobs")
		const companyId = companySlug.split("/")[0] || null;

		if (!name && !description) {
			throw new Error("No LinkedIn content found");
		}

		const result: CompanyData = {
			type: "company",
			title: name || ogTitle || pageTitle,
			url,
			platform: "linkedin",
			name,
			description,
			companyId,
		};
		if (tagline) result.tagline = tagline;
		if (industry) result.industry = industry;
		if (employeeCount) result.employeeCount = employeeCount;
		if (companyType) result.companyType = companyType;
		if (headquarters) result.headquarters = headquarters;
		if (website) result.website = website;
		if (founded) result.founded = founded;
		if (domFields.specialties && domFields.specialties.length > 0) {
			result.specialties = domFields.specialties;
		}
		if (followers) result.followers = followers;
		if (logoUrl) result.logoUrl = logoUrl;
		if (rating) result.rating = rating;
		if (reviewCount) result.reviewCount = reviewCount;
		if (employees.length > 0) result.employees = employees;
		if (similarPages.length > 0) result.similarPages = similarPages;
		if (finalPosts.length > 0) result.posts = finalPosts;
		if (jobListings && jobListings.length > 0) result.jobListings = jobListings;
		if (cultureBlocks && cultureBlocks.length > 0) result.cultureBlocks = cultureBlocks;
		if (companyPhotos && companyPhotos.length > 0) result.companyPhotos = companyPhotos;
		return result;
	}

	// ── Other LinkedIn page (jobs search, etc.) ───────────────────────────────
	if (!ogTitle && !ogDesc) {
		throw new Error("No LinkedIn content found");
	}

	// Return as a generic company-like object for unrecognized paths
	return {
		type: "company",
		title: ogTitle || pageTitle,
		url,
		platform: "linkedin",
		name: ogTitle,
		description: ogDesc !== ogTitle ? ogDesc : null,
	};
}

/** Extract salary text from a JSON-LD JobPosting's baseSalary field */
function extractSalaryFromJsonLd(job: Record<string, unknown>): string | null {
	const salaryRaw = job.baseSalary;
	if (!salaryRaw || typeof salaryRaw !== "object") return null;
	const salary = salaryRaw as Record<string, unknown>;

	const valueSpec = salary.value as Record<string, unknown> | undefined;
	if (!valueSpec) return null;

	const minVal = valueSpec.minValue;
	const maxVal = valueSpec.maxValue;
	const currency = stringVal(salary.currency) ?? "";
	const unitText = stringVal(valueSpec.unitText) ?? "";

	if (minVal != null && maxVal != null) {
		return `${currency}${minVal} - ${currency}${maxVal} ${unitText}`.trim();
	}
	if (minVal != null) return `${currency}${minVal} ${unitText}`.trim();
	return null;
}
