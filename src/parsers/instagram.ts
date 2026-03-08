import { selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { extractMarkdown } from "../html-to-markdown";
import type { CompanyPost, SocialComment, SocialData, SocialProfileData } from "./page-data";

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

function getCanonicalUrl(doc: Document): string | null {
	const link = selectOne('link[rel="canonical"]', doc) as Element | null;
	return link ? (getAttributeValue(link, "href") ?? null) : null;
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

function toIsoDate(raw: string | null): string | null {
	if (!raw) return null;
	const parsed = Date.parse(`${raw} UTC`);
	if (Number.isNaN(parsed)) return raw;
	return new Date(parsed).toISOString().slice(0, 10);
}

function parseProfileStats(text: string | null): {
	followers: string | null;
	following: string | null;
	posts: string | null;
} {
	if (!text) return { followers: null, following: null, posts: null };
	const match = text.match(/([^,]+) Followers,\s*([^,]+) Following,\s*([^\-]+) Posts/i);
	if (!match) return { followers: null, following: null, posts: null };
	return {
		followers: cleanText(match[1] ?? "") || null,
		following: cleanText(match[2] ?? "") || null,
		posts: cleanText(match[3] ?? "") || null,
	};
}

function parseProfileIdentity(title: string | null): { name: string | null; handle: string | null } {
	if (!title) return { name: null, handle: null };
	const match = title.match(/^(.*?)\s*\(@([^()]+)\)/);
	if (!match) return { name: cleanText(title), handle: null };
	return {
		name: cleanText(match[1] ?? "") || null,
		handle: cleanText(match[2] ?? "") || null,
	};
}

function extractProfileBio(text: string | null): string | null {
	if (!text) return null;
	const match = text.match(/on Instagram:\s*["“]([\s\S]*?)["”]\s*$/i);
	return match?.[1] ? cleanText(match[1]) : null;
}

function extractInstagramFeedPosts(markdown: string): CompanyPost[] {
	const relevant = markdown.split("Show more posts from")[0]?.split("Related accounts")[0] ?? markdown;
	const pattern = /\]\((https:\/\/www\.instagram\.com\/[^)\s/]+\/(?:p|reel)\/[^)\s/]+\/?)[^)\s]*\)\n\n## ([\s\S]*?)(?=\n\n\[!\[|\n\nShow more posts from|\n\nRelated accounts|$)/g;
	const posts: CompanyPost[] = [];
	const seen = new Set<string>();
	for (const match of relevant.matchAll(pattern)) {
		const url = match[1] ?? null;
		if (!url || seen.has(url)) continue;
		seen.add(url);
		const text = cleanText(match[2] ?? "");
		if (!text) continue;
		posts.push({
			text,
			resharedText: null,
			headline: null,
			url,
			datePublished: null,
			reactions: null,
			comments: null,
		});
	}
	return posts;
}

function extractInstagramComments(markdown: string): SocialComment[] {
	const relevant = markdown.split("\n\nMore posts from")[0] ?? markdown;
	const pattern = /\[([^\]]+)\]\(https:\/\/www\.instagram\.com\/[^)]+\)\s+\[([^\]]+)\]\(https:\/\/www\.instagram\.com\/p\/[^)]+\/c\/[^)]+\)\n\n([\s\S]*?)\n\nLike\n\nReply/g;
	const comments: SocialComment[] = [];
	for (const match of relevant.matchAll(pattern)) {
		const author = cleanText(match[1] ?? "") || null;
		const date = cleanText(match[2] ?? "") || null;
		const body = stripInlineMarkdown(match[3] ?? "");
		if (!body) continue;
		comments.push({ author, score: null, date, body });
	}
	return comments;
}

function extractImageUrls(markdown: string): string[] {
	const relevant =
		((markdown.split("\n\nMore posts from")[0] ?? markdown).split(/\n!\[[^\]]*profile picture[^\]]*\]/i)[0] ??
			markdown);
	const urls: string[] = [];
	for (const match of relevant.matchAll(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g)) {
		const url = match[1];
		if (url) urls.push(url);
	}
	return unique(urls);
}

function parseInstagramProfile(doc: Document, html: string, url: string): SocialProfileData {
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDescription = getMeta(doc, "og:description");
	const description = getMeta(doc, "description");
	const ogImage = getMeta(doc, "og:image");
	const { markdown } = extractMarkdown(html, url);
	const { name, handle } = parseProfileIdentity(ogTitle ?? pageTitle);
	const stats = parseProfileStats(description ?? ogDescription);
	const bio = extractProfileBio(description) ?? null;
	const posts = extractInstagramFeedPosts(markdown);

	if (!name && !handle) {
		throw new Error("Instagram profile content not found");
	}

	const result: SocialProfileData = {
		type: "social-profile",
		title: ogTitle ?? pageTitle,
		url,
		platform: "instagram",
		name,
		handle,
		bio,
	};

	if (stats.followers) result.followers = stats.followers;
	if (stats.following) result.following = stats.following;
	if (stats.posts) result.postCount = stats.posts;
	if (ogImage) result.profileImageUrl = ogImage;
	if (posts.length > 0) result.posts = posts;

	return result;
}

function parseInstagramPost(doc: Document, html: string, url: string): SocialData {
	const pageTitle = extractTitle(doc);
	const canonicalUrl = getCanonicalUrl(doc) ?? url;
	const metaDescription = (getMeta(doc, "description") ?? getMeta(doc, "og:description"))?.replace(/&quot;/g, "\"") ?? null;
	const ogTitle = getMeta(doc, "og:title");
	const { markdown } = extractMarkdown(html, url);
	const comments = extractInstagramComments(markdown);
	const mediaUrls = extractImageUrls(markdown);

	let likeCount: string | null = null;
	let commentCount: string | null = null;
	let authorHandle: string | null = null;
	let date: string | null = null;
	let body: string | null = null;

	const match = metaDescription?.match(
		/^(.+?) likes?,\s*(.+?) comments? - (.+?) on (.+?):\s*["“]([\s\S]+?)["”]\.?\s*$/i,
	);
	if (match) {
		likeCount = cleanText(match[1] ?? "") || null;
		commentCount = cleanText(match[2] ?? "") || null;
		authorHandle = cleanText(match[3] ?? "") || null;
		date = toIsoDate(cleanText(match[4] ?? ""));
		body = stripInlineMarkdown(match[5] ?? "") || null;
	}

	if (!body) {
		const bodyMatch = markdown.match(/\n\n\[[^\]]+\]\(https:\/\/www\.instagram\.com\/[^)]+\)\s+[0-9A-Za-z]+\n\n([\s\S]*?)\n\n\[!\[/);
		body = bodyMatch?.[1] ? stripInlineMarkdown(bodyMatch[1]) : null;
	}

	const title = body ? body.slice(0, 80) : cleanText(ogTitle ?? pageTitle ?? "Instagram post");
	if (!title || !body) {
		throw new Error("Instagram post content not found");
	}

	const postDetail: SocialData["post"] = {
		title,
		url: canonicalUrl,
		body,
		author: authorHandle,
		authorHandle,
		commentCount,
		date,
	};

	const result: SocialData = {
		type: "social",
		title: title,
		url: canonicalUrl,
		platform: "instagram",
		sectionTitle: authorHandle ? `@${authorHandle}` : null,
		description: null,
		post: postDetail,
		comments,
	};

	if (likeCount) postDetail.likeCount = likeCount;
	if (mediaUrls.length > 0) postDetail.mediaUrls = mediaUrls;

	return result;
}

export function parseInstagram(html: string, url: string): SocialProfileData | SocialData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);
	const pathname = parsedUrl.pathname.replace(/\/$/, "");

	if (/^\/(?:[^/]+\/)?(p|reel)\//.test(pathname)) {
		return parseInstagramPost(doc, html, url);
	}

	return parseInstagramProfile(doc, html, url);
}
