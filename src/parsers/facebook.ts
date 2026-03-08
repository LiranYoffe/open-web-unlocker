import { selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { extractMarkdown } from "../html-to-markdown";
import type {
	BusinessData,
	BusinessReview,
	CompanyData,
	CompanyPost,
	EventData,
	ProductData,
	SearchResultsData,
	SocialData,
	SocialProfileData,
} from "./page-data";

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, key: string): string | null {
	const prop = selectOne(`meta[property="${key}"]`, doc) as Element | null;
	if (prop) return getAttributeValue(prop, "content") ?? null;
	const named = selectOne(`meta[name="${key}"]`, doc) as Element | null;
	return named ? (getAttributeValue(named, "content") ?? null) : null;
}

function cleanText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function stripInlineMarkdown(value: string): string {
	return cleanText(
		value
			.replace(/!\[[^\]]*\]\([^)]+\)/g, "")
			.replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, "$1"),
	);
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function getRelevantMarkdown(html: string, url: string): string {
	return extractMarkdown(html, url).markdown;
}

function isFacebookLoginWall(html: string, url: string): boolean {
	try {
		const pathname = new URL(url).pathname;
		if (pathname === "/login") return true;
	} catch {
		// ignore
	}

	const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
	const hasLoginForm =
		/name="email"|name="pass"|autocomplete="current-password"|id="login_form"/i.test(html);
	const hasOgTitle = /meta[^>]+property="og:title"/i.test(html);

	return title === "Facebook" && hasLoginForm && !hasOgTitle;
}

function extractHeading(markdown: string): string | null {
	const match = markdown.match(/^#\s+(.+)$/m);
	return match?.[1] ? cleanText(match[1]) : null;
}

function extractFollowers(markdown: string): string | null {
	const match = markdown.match(/\[\*\*([^*]+)\*\*\]\([^)]+\)\s*followers/i);
	return match?.[1] ? cleanText(match[1]) : null;
}

function extractReviewSummary(markdown: string): { rating: string | null; reviewCount: string | null } {
	const match = markdown.match(/##\s+([^\n]+?recommend)\s*\(([^)]+Reviews)\)/i);
	if (!match) return { rating: null, reviewCount: null };
	return {
		rating: cleanText(match[1] ?? "") || null,
		reviewCount: cleanText((match[2] ?? "").replace(/Reviews/i, "")) || null,
	};
}

function extractIntro(markdown: string): string | null {
	const match = markdown.match(/## Intro\n\n([\s\S]*?)(?=\n\n!\[\]|\n\n## )/);
	return match?.[1] ? cleanText(match[1]) : null;
}

function extractCompanyType(markdown: string): string | null {
	const match = markdown.match(/\*\*([^*]+)\*\*\s*·\s*([^\n]+)/);
	if (!match) return null;
	return `${cleanText(match[1] ?? "")} · ${cleanText(match[2] ?? "")}`.trim();
}

function extractPrimaryWebsite(markdown: string): string | null {
	const matches = [...markdown.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)];
	const preferred = matches.find((match) => /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(cleanText(match[1] ?? "")));
	if (preferred?.[1]) return cleanText(preferred[1]);
	for (const match of matches) {
		const label = cleanText(match[1] ?? "");
		if (!label || /^https?:\/\/www\.facebook\.com/i.test(label)) continue;
		if (label.includes("facebook.com")) continue;
		if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/.*)?$/.test(label)) return label;
	}
	return null;
}

function extractPhotoUrls(markdown: string): string[] {
	const photoSection = markdown.match(/## \[Photos\][\s\S]*?(?=\n\n## \[\*\*|$)/)?.[0] ?? "";
	const urls = [...photoSection.matchAll(/!\[\]\((https:\/\/scontent[^)]+)\)/g)].map((match) => match[1]);
	return unique(urls.filter(Boolean));
}

function extractEventSection(markdown: string): string {
	const detailsIndex = markdown.indexOf("\n## Details");
	if (detailsIndex === -1) return markdown;
	const startIndex = markdown.lastIndexOf("\n# ", detailsIndex);
	if (startIndex === -1) return markdown.slice(detailsIndex);
	return markdown.slice(startIndex + 1);
}

function getNonEmptyLines(markdown: string): string[] {
	return markdown
		.split("\n")
		.map((line) => cleanText(line))
		.filter(Boolean);
}

function extractEventId(url: string): string | null {
	const match = url.match(/\/events(?:\/s\/[^/]+)?\/(\d+)/i);
	return match?.[1] ?? null;
}

function extractMarketplaceItemId(url: string): string | null {
	const match = url.match(/\/marketplace\/item\/(\d+)/i);
	return match?.[1] ?? null;
}

function extractGroupId(url: string): string | null {
	const match = url.match(/\/groups\/([^/?#]+)/i);
	return match?.[1] ?? null;
}

function cleanMarkdownLine(value: string): string {
	return cleanText(
		stripInlineMarkdown(
			value
				.replace(/^#+\s*/, "")
				.replace(/\*\*/g, "")
				.replace(/^[-*]\s*/, ""),
		),
	);
}

function extractFirstImageUrl(markdown: string): string | null {
	const match = markdown.match(/!\[[^\]]*]\((https:\/\/[^)]+)\)/);
	return cleanText(match?.[1] ?? "") || null;
}

function parsePrice(raw: string): { price: string | null; currency: string | null } {
	const cleaned = cleanText(raw);
	if (!cleaned) return { price: null, currency: null };
	if (/^free$/i.test(cleaned)) return { price: "Free", currency: null };
	const repeatedPrices = [...cleaned.matchAll(/([$£€])?\s*([0-9][0-9,.]*)/g)];
	if (repeatedPrices.length > 1 && repeatedPrices[0]) {
		return {
			price: cleanText(repeatedPrices[0][2] ?? "") || null,
			currency: cleanText(repeatedPrices[0][1] ?? "") || null,
		};
	}
	const match = cleaned.match(/^([^0-9A-Za-z-]*)([0-9][0-9,.\s]*(?:\s*-\s*[0-9][0-9,.\s]*)?)$/);
	if (!match) return { price: cleaned, currency: null };
	return {
		price: cleanText(match[2] ?? "") || null,
		currency: cleanText(match[1] ?? "") || null,
	};
}

function extractCompanyPosts(markdown: string): CompanyPost[] {
	const lines = markdown.split("\n");
	const posts: CompanyPost[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i]?.startsWith("## [**")) continue;
		let j = i + 1;
		while (j < lines.length && !lines[j]?.trim()) j++;
		const dateLine = lines[j] ?? "";
		const dateMatch = dateLine.match(/^\[([^\]]+)\]\([^)]+\)\s*·?/);
		if (!dateMatch) continue;
		j++;
		while (j < lines.length && !lines[j]?.trim()) j++;
		const bodyLines: string[] = [];
		while (j < lines.length && !/^All reactions:$/.test(lines[j] ?? "") && !/^## \[\*\*/.test(lines[j] ?? "")) {
			bodyLines.push(lines[j] ?? "");
			j++;
		}
		const body = stripInlineMarkdown(
			bodyLines
				.filter(
					(line) =>
						line.trim() &&
						!/^\d+:\d+\s*\/\s*\d+:\d+$/.test(line.trim()) &&
						!/^\[[0-9: /]+\]\(/.test(line.trim()),
				)
				.join("\n"),
		);
		if (!body) continue;

		let reactions: string | null = null;
		let comments: string | null = null;
		if (/^All reactions:$/.test(lines[j] ?? "")) {
			j++;
			const metrics: string[] = [];
			while (j < lines.length && !/^Like$/.test(lines[j] ?? "") && !/^## \[\*\*/.test(lines[j] ?? "")) {
				const candidate = cleanText(lines[j] ?? "");
				if (candidate && /^[0-9.,KM]+$/i.test(candidate)) metrics.push(candidate);
				j++;
			}
			reactions = metrics[0] ?? null;
			comments = metrics[1] ?? null;
		}

		posts.push({
			text: body,
			resharedText: null,
			headline: null,
			url: null,
			datePublished: cleanText(dateMatch[1] ?? "") || null,
			reactions,
			comments,
		});
		i = Math.max(i, j - 1);
	}
	return posts;
}

function extractReviews(markdown: string): BusinessReview[] {
	const lines = markdown.split("\n");
	const reviews: BusinessReview[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (!line.startsWith("## **[")) continue;
		const headerMatch = line.match(/##\s+\*\*\[([^\]]+)\]\([^)]+\)\*\*.*?\s(recommends|doesn't recommend)\s\*\*\[([^\]]+)\]\([^)]+\)\*\*/i);
		if (!headerMatch) continue;
		const author = cleanText(headerMatch[1] ?? "") || null;
		const title = cleanText(headerMatch[2] ?? "") || null;
		let j = i + 1;
		while (j < lines.length && !lines[j]?.trim()) j++;
		const dateMatch = (lines[j] ?? "").match(/^\[([^\]]+)\]\([^)]+\)/);
		const date = dateMatch?.[1] ? cleanText(dateMatch[1]) : null;
		j++;
		while (j < lines.length && !lines[j]?.trim()) j++;
		const bodyLines: string[] = [];
		while (j < lines.length && !/^All reactions:$/.test(lines[j] ?? "") && !/^## \*\*\[/.test(lines[j] ?? "")) {
			bodyLines.push(lines[j] ?? "");
			j++;
		}
		const body = stripInlineMarkdown(bodyLines.join("\n"));
		if (!body) continue;
		reviews.push({ author, rating: null, date, title, body });
		i = Math.max(i, j - 1);
	}
	return reviews;
}

function extractFacebookVisibleComments(markdown: string): SocialData["comments"] {
	const lines = markdown
		.split("\n")
		.map((line) => cleanMarkdownLine(line))
		.filter(Boolean);
	const startIndex = lines.findIndex((line) => /^most relevant$/i.test(line));
	if (startIndex === -1) return [];

	const comments: SocialData["comments"] = [];
	let buffer: string[] = [];

	for (let i = startIndex + 1; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (!line || /^(like|comment|share|reply|join|log in|forgot account\?|view more replies)$/i.test(line)) {
			continue;
		}

		const dateMatch = line.match(/^([0-9]+[smhdwy]|yesterday|today)$/i);
		if (dateMatch) {
			if (buffer.length >= 2) {
				const [author, ...bodyLines] = buffer;
				const body = cleanText(bodyLines.join("\n"));
				if (author && body) {
					comments.push({
						author,
						score: null,
						date: cleanText(dateMatch[1] ?? "") || null,
						body,
					});
				}
			}
			buffer = [];
			continue;
		}

		buffer.push(line);
	}

	return comments;
}

function parseFacebookGroupPage(doc: Document, html: string, url: string): SocialProfileData {
	const markdown = getRelevantMarkdown(html, url);
	const name = stripInlineMarkdown(extractHeading(markdown) ?? "") || null;
	const followers =
		cleanText(markdown.match(/\n([0-9][0-9.,KMB]*\s+members)\n/i)?.[1] ?? "") || null;
	const category =
		cleanText(markdown.match(/\n(Public|Private)\s+group\n/i)?.[0]?.replace(/\s+/g, " ") ?? "") ||
		null;
	const bio =
		stripInlineMarkdown(
			markdown
				.match(/\n## About\n\n([\s\S]*?)(?=\n\n(?:Public|Private|Visible|## |$))/i)?.[1] ??
				"",
		)
			.replace(/\bSee more\b/gi, "")
			.trim() || null;
	const nameOrTitle = name ?? extractTitle(doc);
	if (!nameOrTitle) {
		throw new Error("Facebook group page content not found");
	}

	return {
		type: "social-profile",
		title: nameOrTitle,
		url,
		platform: "facebook",
		name: nameOrTitle,
		handle: extractGroupId(url),
		bio,
		followers,
		profileImageUrl: getMeta(doc, "og:image") ?? extractFirstImageUrl(markdown),
		category,
	};
}

function parseFacebookGroupPost(doc: Document, html: string, url: string): SocialData {
	const markdown = getRelevantMarkdown(html, url);
	const groupName =
		cleanText(markdown.match(/\n\[([^\]]+)\]\(https:\/\/www\.facebook\.com\/groups\/[^)]+\)/)?.[1] ?? "") ||
		null;
	const authorMatch = markdown.match(/\nJoin\n\n([^\n]+)\n\n\s*·\s*([^\n·]+)\s*·/i);
	const author = cleanText(authorMatch?.[1] ?? "") || null;
	const date = cleanText(authorMatch?.[2] ?? "") || null;
	if (!groupName || !author) {
		throw new Error("Facebook group post content not found");
	}

	const normalizedLines = markdown
		.split("\n")
		.map((line) => cleanMarkdownLine(line))
		.filter(Boolean);
	const authorIndex = normalizedLines.findIndex((line) => line === author);
	if (authorIndex === -1) {
		throw new Error("Facebook group post author not found");
	}

	let startIndex = authorIndex + 1;
	while (startIndex < normalizedLines.length && !/^[0-9]+[smhdwy]\s*·?$/i.test(normalizedLines[startIndex] ?? "")) {
		startIndex++;
	}
	if (startIndex < normalizedLines.length) startIndex++;
	while (
		startIndex < normalizedLines.length &&
		/^(may be an image|no photo description available\.?|see more)$/i.test(normalizedLines[startIndex] ?? "")
	) {
		startIndex++;
	}
	if (
		startIndex + 1 < normalizedLines.length &&
		/^[A-Z0-9][A-Za-z0-9 '&.-]{2,}$/i.test(normalizedLines[startIndex] ?? "") &&
		/^[0-9]+[smhdwy]\s*·?$/i.test(normalizedLines[startIndex + 1] ?? "")
	) {
		startIndex += 2;
	}

	const endIndex = normalizedLines.findIndex((line, index) => index >= startIndex && /^All reactions:$/i.test(line));
	const bodyLines = normalizedLines
		.slice(startIndex, endIndex === -1 ? normalizedLines.length : endIndex)
		.filter((line) => !/^(like|comment|join|log in|forgot account\?)$/i.test(line));
	const body = cleanText(bodyLines.join("\n")) || null;
	if (!body) {
		throw new Error("Facebook group post body not found");
	}

	const title = body.slice(0, 80);
	const likeCount =
		endIndex !== -1 ? cleanText(normalizedLines[endIndex + 1] ?? "") || null : null;
	const commentCount =
		endIndex !== -1
			? cleanText(
					normalizedLines.find(
						(line, index) =>
							index > endIndex && /^[0-9][0-9.,KMB]*\s+comments?$/i.test(line),
					) ?? "",
				) || null
			: null;

	return {
		type: "social",
		title,
		url,
		platform: "facebook",
		sectionTitle: groupName,
		description: null,
		post: {
			title,
			url,
			body,
			author,
			commentCount,
			date,
			likeCount,
		},
		comments: extractFacebookVisibleComments(markdown),
	};
}

function parseFacebookReviewPage(doc: Document, html: string, url: string): BusinessData {
	const pageTitle = extractTitle(doc);
	const markdown = getRelevantMarkdown(html, url);
	const name = extractHeading(markdown);
	const summary = extractReviewSummary(markdown);
	const reviews = extractReviews(markdown);

	if (!name) {
		throw new Error("Facebook reviews content not found");
	}

	return {
		type: "business",
		title: name,
		url,
		name,
		rating: summary.rating,
		reviewCount: summary.reviewCount,
		description: getMeta(doc, "og:description") ?? null,
		reviews,
	};
}

function parseFacebookEvent(doc: Document, html: string, url: string): EventData {
	const fullMarkdown = getRelevantMarkdown(html, url);
	const markdown = extractEventSection(fullMarkdown);
	if (!markdown.includes("## Details")) {
		throw new Error("Facebook event content not found");
	}

	const lines = getNonEmptyLines(markdown);
	const titleIndex = lines.findIndex((line) => line.startsWith("# "));
	if (titleIndex === -1) {
		throw new Error("Facebook event title not found");
	}

	const eventName = cleanText(lines[titleIndex]?.replace(/^#\s+/, "") ?? "") || null;

	const startDate =
		cleanText(fullMarkdown.match(/\n([^\n]*\d{4}[^\n]*)\n\n#\s+/)?.[1] ?? "") || null;

	let location: string | null =
		cleanText(
			markdown.match(/\n\[([^\]]+,\s*[^\]]+)\]\(https:\/\/www\.facebook\.com\/events\/explore\/[^)]+\)/)?.[1] ?? "",
		) || null;
	if (!location) {
		for (let i = titleIndex + 1; i < lines.length; i++) {
			const candidate = lines[i] ?? "";
			if (
				candidate &&
				!/^(About|Discussion|More|Invite)$/i.test(candidate) &&
				!candidate.startsWith("[")
			) {
				location = candidate;
				break;
			}
		}
	}

	const peopleResponded =
		cleanText(markdown.match(/\n([0-9][0-9,.\sKMB]*\s+people responded)\n/i)?.[1] ?? "") || null;
	const organizer =
		cleanText(markdown.match(/Event by \*\*\[([^\]]+)\]\([^)]+\)\*\*/i)?.[1] ?? "") || null;
	const duration = cleanText(markdown.match(/Duration:\s*([^\n]+)/i)?.[1] ?? "") || null;
	const privacy = cleanText(markdown.match(/\n((?:Public|Private)\s+·\s+[^\n]+)\n/i)?.[1] ?? "") || null;
	const description =
		stripInlineMarkdown(
			markdown.match(/\n(?:Public|Private)\s+·\s+[^\n]+\n\n([\s\S]*?)(?=\n\n\[|\n\n## |\nLog in or sign up)/i)?.[1] ??
			"",
		) || null;
	const imageUrl = getMeta(doc, "og:image") ?? null;

	return {
		type: "event",
		title: eventName,
		url,
		platform: "facebook",
		eventName,
		startDate,
		location,
		description,
		organizer,
		peopleResponded,
		duration,
		privacy,
		eventId: extractEventId(url),
		imageUrl,
	};
}

function parseFacebookMarketplaceItem(doc: Document, html: string, url: string): ProductData {
	const markdown = getRelevantMarkdown(html, url);
	const title = extractHeading(markdown);
	if (!title || !/marketplace/i.test(markdown)) {
		throw new Error("Facebook Marketplace item content not found");
	}

	const normalizedLines = markdown
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const titleIndex = normalizedLines.findIndex((line) => line === `# ${title}`);
	if (titleIndex === -1) {
		throw new Error("Facebook Marketplace item title not found");
	}

	const priceLine = normalizedLines[titleIndex + 1] ?? "";
	const { price, currency } = parsePrice(priceLine);
	const listedLine = normalizedLines.find((line) => /^Listed\s+.+\s+in\s+.+/i.test(line)) ?? null;
	const listedMatch = listedLine?.match(/^Listed\s+(.+?)\s+in\s+(.+)$/i);
	const listedDate = cleanText(listedMatch?.[1] ?? "") || null;
	const location = stripInlineMarkdown(listedMatch?.[2] ?? "") || null;

	const categories: string[] = [];
	for (let i = titleIndex + 2; i < normalizedLines.length; i++) {
		const line = normalizedLines[i] ?? "";
		if (/^Listed\s+.+\s+in\s+.+/i.test(line)) break;
		if (line === "›") continue;
		const categoryMatch = line.match(/^\[([^\]]+)\]\(https:\/\/www\.facebook\.com\/marketplace\/[^)]+\)$/i);
		if (categoryMatch?.[1]) categories.push(cleanText(categoryMatch[1]));
	}

	const detailsSection = markdown.match(/\nDetails\n\n([\s\S]*?)(?=\n\n## |\n\nMessage\n|\n\nSave\n|\n\nShare\n|$)/i)?.[1] ?? "";
	const condition =
		cleanText(detailsSection.match(/Condition\s*\n(?:-\s*)?([^\n]+)/i)?.[1] ?? "") ||
		cleanText(detailsSection.match(/-\s*Condition\s*\n([^\n]+)/i)?.[1] ?? "") ||
		null;

	const description =
		stripInlineMarkdown(
			detailsSection
				.replace(/-\s*Condition\s*\n[^\n]+/i, "")
				.replace(/\nSee more\b[\s\S]*$/i, "")
				.replace(/\nLocation is approximate[\s\S]*$/i, "")
				.replace(/\n[A-Z][^\n]*,\s*[A-Z]{2,}\s*$/i, "")
				.trim(),
		) || null;

	const images = unique(
		[...markdown.matchAll(/!\[Product photo[^\]]*]\((https:\/\/[^)]+)\)/g)]
			.map((match) => cleanText(match[1] ?? ""))
			.filter(Boolean),
	);

	return {
		type: "product",
		title,
		url,
		platform: "facebook",
		name: title,
		sku: extractMarketplaceItemId(url),
		price,
		currency,
		availability: null,
		condition,
		categories,
		location,
		listedDate,
		rating: null,
		reviewCount: null,
		specifications: [],
		description,
		images,
	};
}

function parseFacebookMarketplaceSearch(html: string, url: string): SearchResultsData {
	const markdown = getRelevantMarkdown(html, url);
	if (!markdown.includes("# Search results")) {
		throw new Error("Facebook Marketplace search content not found");
	}

	const results = [...markdown.matchAll(/\[!\[([^\]]+)\]\((https:\/\/[^)]+)\)([^\]]*)\]\((https:\/\/www\.facebook\.com\/marketplace\/item\/[^)]+)\)/g)]
		.map((match, index) => {
			const alt = cleanText(match[1] ?? "");
			const imageUrl = cleanText(match[2] ?? "") || null;
			const cardText = cleanText(match[3] ?? "");
			const rawUrl = cleanText(match[4] ?? "");
			if (!alt || !rawUrl) return null;

			const altMatch = alt.match(/^(.*)\s+in\s+([^]+)$/i);
			const title = cleanText(altMatch?.[1] ?? alt) || null;
			const location = cleanText(altMatch?.[2] ?? "") || null;
			if (!title) return null;

			let priceText = cardText;
			if (location) priceText = priceText.replace(location, "");
			priceText = priceText.replace(title, "");
			const { price, currency } = parsePrice(priceText);

			const normalizedUrl = new URL(rawUrl);
			normalizedUrl.search = "";

			return {
				position: index + 1,
				title,
				url: normalizedUrl.toString(),
				snippet: null,
				location,
				imageUrl,
				price,
				category: null,
				rating: null,
				reviewCount: null,
				displayUrl: normalizedUrl.pathname,
			};
		})
		.filter((result): result is NonNullable<typeof result> => Boolean(result));

	if (results.length === 0) {
		throw new Error("Facebook Marketplace search results not found");
	}

	return {
		type: "search-results",
		title: "Search results",
		url,
		engine: "facebook",
		query: new URL(url).searchParams.get("query"),
		results,
	};
}

function parseFacebookReel(doc: Document, html: string, url: string): SocialData {
	const pageTitle = extractTitle(doc);
	const markdown = getRelevantMarkdown(html, url);
	const lines = markdown.split("\n").map((line) => line.trim());
	const firstContentLine = lines.find((line) => line && !/^\[.*\]\(.*\)$/.test(line) && !/^Log In$/i.test(line) && !/^Forgot Account/i.test(line));
	const authorLine = lines.find((line) => line.startsWith("## [") && line.includes("facebook.com"));
	const authorMatch = authorLine?.match(/##\s+\[([^\]]+)\]/);
	const metrics = lines.filter((line) => /^[0-9.,KM]+$/i.test(line));
	const body = firstContentLine ? stripInlineMarkdown(firstContentLine) : null;
	const author = authorMatch?.[1] ? cleanText(authorMatch[1]) : null;
	const title = body ? body.slice(0, 80) : cleanText(pageTitle ?? "Facebook reel");

	if (!body) {
		throw new Error("Facebook reel content not found");
	}

	const postDetail: SocialData["post"] = {
		title,
		url,
		body,
		author,
		commentCount: metrics[1] ?? null,
		date: null,
	};

	const result: SocialData = {
		type: "social",
		title,
		url,
		platform: "facebook",
		sectionTitle: author,
		description: null,
		post: postDetail,
		comments: [],
	};

	if (metrics[0]) postDetail.likeCount = metrics[0];
	if (metrics[2]) postDetail.shareCount = metrics[2];

	return result;
}

function parseFacebookPage(doc: Document, html: string, url: string): CompanyData {
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const markdown = getRelevantMarkdown(html, url);
	const name = extractHeading(markdown) ?? cleanText(ogTitle ?? pageTitle ?? "");
	const followers = extractFollowers(markdown);
	const summary = extractReviewSummary(markdown);
	const posts = extractCompanyPosts(markdown);
	const companyPhotos = extractPhotoUrls(markdown);

	if (!name) {
		throw new Error("Facebook page content not found");
	}

	const result: CompanyData = {
		type: "company",
		title: name,
		url,
		platform: "facebook",
		name,
		description: extractIntro(markdown) ?? getMeta(doc, "og:description") ?? null,
		companyType: extractCompanyType(markdown),
		website: extractPrimaryWebsite(markdown),
	};

	if (followers) result.followers = followers;
	if (summary.rating) result.rating = summary.rating;
	if (summary.reviewCount) result.reviewCount = summary.reviewCount;
	if (posts.length > 0) result.posts = posts;
	if (companyPhotos.length > 0) result.companyPhotos = companyPhotos;

	return result;
}

export function parseFacebook(
	html: string,
	url: string,
): CompanyData | BusinessData | EventData | ProductData | SearchResultsData | SocialData | SocialProfileData {
	if (isFacebookLoginWall(html, url)) {
		throw new Error("Facebook login wall encountered");
	}

	const doc = parseDocument(html);
	const pathname = new URL(url).pathname.replace(/\/$/, "");
	if (/^\/marketplace(?:\/[^/]+)?\/search$/i.test(pathname)) {
		return parseFacebookMarketplaceSearch(html, url);
	}
	if (/^\/marketplace\/item\/\d+$/i.test(pathname)) {
		return parseFacebookMarketplaceItem(doc, html, url);
	}
	if (/^\/events(?:\/s\/[^/]+)?\/\d+$/i.test(pathname)) {
		return parseFacebookEvent(doc, html, url);
	}
	if (/^\/groups\/[^/]+\/posts\/\d+$/i.test(pathname)) {
		return parseFacebookGroupPost(doc, html, url);
	}
	if (/^\/groups\/[^/]+$/i.test(pathname)) {
		return parseFacebookGroupPage(doc, html, url);
	}
	if (/\/reviews$/i.test(pathname)) {
		return parseFacebookReviewPage(doc, html, url);
	}
	if (/^\/(reel|watch)\//i.test(pathname) || /\/(posts|videos)\//i.test(pathname) || /^\/(permalink\.php|photo\.php)$/i.test(pathname)) {
		return parseFacebookReel(doc, html, url);
	}
	return parseFacebookPage(doc, html, url);
}
