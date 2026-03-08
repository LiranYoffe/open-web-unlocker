import { selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
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

function formatNumeric(value: unknown): string | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value.toLocaleString("en-US");
	}
	if (typeof value === "string" && /^\d+$/.test(value)) {
		return Number(value).toLocaleString("en-US");
	}
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatExternalUrl(value: unknown): string | null {
	if (typeof value !== "string" || !value.trim()) return null;
	const trimmed = value.trim();
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

function toIsoDateTime(raw: unknown): string | null {
	const value = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
	if (!Number.isFinite(value)) return null;
	return new Date(value * 1000).toISOString();
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function getDefaultScope(doc: Document): Record<string, unknown> | null {
	const script = selectOne('script#__UNIVERSAL_DATA_FOR_REHYDRATION__', doc) as Element | null;
	if (!script) return null;
	try {
		const parsed = JSON.parse(textContent(script)) as Record<string, unknown>;
		const scope = parsed.__DEFAULT_SCOPE__;
		return scope && typeof scope === "object" ? (scope as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function parseTikTokProfile(scope: Record<string, unknown>, doc: Document, url: string): SocialProfileData {
	const pageTitle = extractTitle(doc);
	const detail = scope["webapp.user-detail"] as Record<string, unknown> | undefined;
	const userInfo = detail?.userInfo as Record<string, unknown> | undefined;
	const user = userInfo?.user as Record<string, unknown> | undefined;
	const stats = (userInfo?.statsV2 as Record<string, unknown> | undefined) ??
		(userInfo?.stats as Record<string, unknown> | undefined);
	const shareMeta = detail?.shareMeta as Record<string, unknown> | undefined;
	const itemList = Array.isArray(userInfo?.itemList) ? (userInfo?.itemList as Record<string, unknown>[]) : [];
	const posts: CompanyPost[] = [];
	if (typeof user?.uniqueId === "string") {
		for (const item of itemList) {
			const id = typeof item.id === "string" ? item.id : null;
			const desc = typeof item.desc === "string" ? cleanText(item.desc) : "";
			const statsValue = item.statsV2 as Record<string, unknown> | undefined;
			if (!id || !desc) continue;
			posts.push({
				text: desc,
				resharedText: null,
				headline: null,
				url: `https://www.tiktok.com/@${user.uniqueId}/video/${id}`,
				datePublished: toIsoDateTime(item.createTime),
				reactions: formatNumeric(statsValue?.diggCount ?? null),
				comments: formatNumeric(statsValue?.commentCount ?? null),
			});
		}
	}

	if (!user) {
		throw new Error("TikTok profile content not found");
	}

	const result: SocialProfileData = {
		type: "social-profile",
		title: (typeof shareMeta?.title === "string" ? shareMeta.title : null) ?? pageTitle,
		url,
		platform: "tiktok",
		name: typeof user.nickname === "string" ? user.nickname : null,
		handle: typeof user.uniqueId === "string" ? user.uniqueId : null,
		bio: typeof user.signature === "string" ? cleanText(user.signature) : null,
	};

	const followers = formatNumeric(stats?.followerCount ?? null);
	const following = formatNumeric(stats?.followingCount ?? null);
	const likeCount = formatNumeric(stats?.heartCount ?? stats?.heart ?? null);
	const postCount = formatNumeric(stats?.videoCount ?? null);
	const avatar =
		(typeof user.avatarLarger === "string" ? user.avatarLarger : null) ??
		(typeof user.avatarMedium === "string" ? user.avatarMedium : null) ??
		(typeof user.avatarThumb === "string" ? user.avatarThumb : null);
	const bioLink = formatExternalUrl((user.bioLink as Record<string, unknown> | undefined)?.link);
	const category = typeof (user.commerceUserInfo as Record<string, unknown> | undefined)?.category === "string"
		? ((user.commerceUserInfo as Record<string, unknown>).category as string)
		: null;

	if (followers) result.followers = followers;
	if (following) result.following = following;
	if (likeCount) result.likeCount = likeCount;
	if (postCount) result.postCount = postCount;
	if (typeof user.verified === "boolean") result.verified = user.verified;
	if (avatar) result.profileImageUrl = avatar;
	if (bioLink) result.externalUrl = bioLink;
	if (category) result.category = category;
	if (posts.length > 0) result.posts = posts;

	return result;
}

function parseTikTokComments(rawComments: unknown[]): SocialComment[] {
	const comments: SocialComment[] = [];
	for (const rawComment of rawComments) {
		if (!rawComment || typeof rawComment !== "object") continue;
		const comment = rawComment as Record<string, unknown>;
		const text = typeof comment.text === "string" ? cleanText(comment.text) : "";
		if (!text) continue;
		const author = typeof (comment.user as Record<string, unknown> | undefined)?.nickname === "string"
			? (((comment.user as Record<string, unknown>).nickname as string))
			: typeof (comment.user as Record<string, unknown> | undefined)?.uniqueId === "string"
				? (((comment.user as Record<string, unknown>).uniqueId as string))
				: null;
		comments.push({
			author,
			score: formatNumeric(comment.diggCount ?? null),
			date: toIsoDateTime(comment.createTime),
			body: text,
		});
	}
	return comments;
}

function parseTikTokVideo(scope: Record<string, unknown>, doc: Document, url: string): SocialData {
	const pageTitle = extractTitle(doc);
	const canonicalUrl = getCanonicalUrl(doc) ?? url;
	const detail = scope["webapp.video-detail"] as Record<string, unknown> | undefined;
	const itemInfo = detail?.itemInfo as Record<string, unknown> | undefined;
	const item = itemInfo?.itemStruct as Record<string, unknown> | undefined;
	const shareMeta = detail?.shareMeta as Record<string, unknown> | undefined;

	if (!item) {
		throw new Error("TikTok video content not found");
	}

	const author = item.author as Record<string, unknown> | undefined;
	const stats = (item.statsV2 as Record<string, unknown> | undefined) ??
		(item.stats as Record<string, unknown> | undefined);
	const video = item.video as Record<string, unknown> | undefined;
	const contents = Array.isArray(item.contents) ? (item.contents as Record<string, unknown>[]) : [];
	const caption =
		(typeof item.desc === "string" && cleanText(item.desc)) ||
		(typeof contents[0]?.desc === "string" && cleanText(contents[0].desc as string)) ||
		null;
	const mediaUrls = unique(
		[video?.cover, video?.originCover, video?.dynamicCover]
			.filter((value): value is string => typeof value === "string" && value.length > 0),
	);
	const comments = parseTikTokComments(Array.isArray(item.comments) ? (item.comments as unknown[]) : []);
	const title = caption ? caption.slice(0, 80) : cleanText((typeof shareMeta?.title === "string" ? shareMeta.title : null) ?? pageTitle ?? "TikTok video");

	const postDetail: SocialData["post"] = {
		title,
		url: canonicalUrl,
		body: caption,
		author: typeof author?.nickname === "string" ? author.nickname : null,
		authorHandle: typeof author?.uniqueId === "string" ? author.uniqueId : null,
		commentCount: formatNumeric(stats?.commentCount ?? null),
		date: toIsoDateTime(item.createTime),
	};

	const result: SocialData = {
		type: "social",
		title,
		url: canonicalUrl,
		platform: "tiktok",
		sectionTitle: typeof author?.uniqueId === "string" ? `@${author.uniqueId}` : null,
		description: null,
		post: postDetail,
		comments,
	};

	const likeCount = formatNumeric(stats?.diggCount ?? null);
	const shareCount = formatNumeric(stats?.shareCount ?? null);
	const viewCount = formatNumeric(stats?.playCount ?? null);
	const playAddr = typeof video?.playAddr === "string" ? video.playAddr : null;
	const downloadAddr = typeof video?.downloadAddr === "string" ? video.downloadAddr : null;
	const avatar =
		(typeof author?.avatarLarger === "string" ? author.avatarLarger : null) ??
		(typeof author?.avatarMedium === "string" ? author.avatarMedium : null) ??
		(typeof author?.avatarThumb === "string" ? author.avatarThumb : null);

	if (likeCount) postDetail.likeCount = likeCount;
	if (shareCount) postDetail.shareCount = shareCount;
	if (viewCount) postDetail.viewCount = viewCount;
	if (mediaUrls.length > 0) postDetail.mediaUrls = mediaUrls;
	if (playAddr || downloadAddr) postDetail.videoUrl = playAddr ?? downloadAddr;
	if (avatar) result.profileImageUrl = avatar;
	if (typeof author?.verified === "boolean") result.isProfileVerified = author.verified;

	return result;
}

export function parseTiktok(html: string, url: string): SocialProfileData | SocialData {
	const doc = parseDocument(html);
	const scope = getDefaultScope(doc);
	if (!scope) {
		throw new Error("TikTok inline data not found");
	}
	const pathname = new URL(url).pathname.replace(/\/$/, "");
	if (/^\/@[^/]+\/video\//.test(pathname)) {
		return parseTikTokVideo(scope, doc, url);
	}
	return parseTikTokProfile(scope, doc, url);
}
