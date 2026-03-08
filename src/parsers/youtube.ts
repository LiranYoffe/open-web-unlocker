import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { SearchResult, SearchResultsData, VideoComment, VideoData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	if (!titleEl) return null;
	const raw = textContent(titleEl).trim();
	return raw.replace(/\s*-\s*YouTube\s*$/, "").trim() || null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

/** Get `content` attribute from an element matching the selector */
function getContent(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

/** Get `href` attribute from an element matching the selector */
function getHref(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, "href") ?? null) : null;
}

/**
 * Extract subscriber count from ytInitialData.
 * Returns something like "1.06M subscribers".
 */
function extractSubscriberCount(html: string): string | null {
	const m = html.match(/"subscriberCountText":.{0,200}?"simpleText":"([^"]+)"/s);
	return m ? (m[1] ?? null) : null;
}

function extractJsonAssignment(
	html: string,
	variableName: string,
): Record<string, unknown> | null {
	const start = html.indexOf(`var ${variableName} = `);
	if (start === -1) return null;
	const jsonStart = html.indexOf("{", start);
	if (jsonStart === -1) return null;
	const scriptEnd = html.indexOf(";</script>", jsonStart);
	if (scriptEnd === -1) return null;
	const jsonStr = html.slice(jsonStart, scriptEnd);
	try {
		return JSON.parse(jsonStr) as Record<string, unknown>;
	} catch {
		return null;
	}
}

/**
 * Parse the ytInitialData JSON blob from the page HTML.
 * Returns the parsed object or null if not found.
 */
function extractYtInitialData(html: string): Record<string, unknown> | null {
	return extractJsonAssignment(html, "ytInitialData");
}

function extractYtInitialPlayerResponse(html: string): Record<string, unknown> | null {
	return extractJsonAssignment(html, "ytInitialPlayerResponse");
}

/**
 * Extract the full video description from the embedded ytInitialPlayerResponse JS variable.
 * The shortDescription field contains the complete untruncated description.
 */
function extractFullDescription(html: string): string | null {
	const playerResponse = extractYtInitialPlayerResponse(html);
	const videoDetails = playerResponse?.videoDetails as Record<string, unknown> | undefined;
	if (typeof videoDetails?.shortDescription === "string" && videoDetails.shortDescription.trim()) {
		return videoDetails.shortDescription.trim();
	}

	const playerMicroformat = (playerResponse?.microformat as Record<string, unknown> | undefined)
		?.playerMicroformatRenderer as Record<string, unknown> | undefined;
	return extractRunsText(playerMicroformat?.description ?? null);
}

function extractRunsText(value: unknown): string | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	if (typeof record.simpleText === "string" && record.simpleText.trim()) {
		return record.simpleText.trim();
	}
	const runs = Array.isArray(record.runs) ? (record.runs as Record<string, unknown>[]) : [];
	if (runs.length === 0) return null;
	const text = runs
		.map((run) => (typeof run.text === "string" ? run.text : ""))
		.join("")
		.trim();
	return text || null;
}

function extractNestedUrl(value: unknown): string | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const direct = ((record.commandMetadata as Record<string, unknown> | undefined)
		?.webCommandMetadata as Record<string, unknown> | undefined)
		?.url;
	if (typeof direct === "string" && direct.trim()) {
		return direct.startsWith("http") ? direct : `https://www.youtube.com${direct}`;
	}
	for (const child of Object.values(record)) {
		const nested = extractNestedUrl(child);
		if (nested) return nested;
	}
	return null;
}

function collectRendererObjects(
	node: unknown,
	key: string,
	out: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
	if (!node || typeof node !== "object") return out;
	if (Array.isArray(node)) {
		for (const item of node) collectRendererObjects(item, key, out);
		return out;
	}
	const record = node as Record<string, unknown>;
	const renderer = record[key];
	if (renderer && typeof renderer === "object" && !Array.isArray(renderer)) {
		out.push(renderer as Record<string, unknown>);
	}
	for (const child of Object.values(record)) {
		collectRendererObjects(child, key, out);
	}
	return out;
}

function extractYouTubeSearchResults(data: Record<string, unknown>): SearchResult[] {
	const results: SearchResult[] = [];
	const seenUrls = new Set<string>();
	let position = 1;

	const pushResult = (title: string | null, url: string | null, snippet: string | null) => {
		if (!title || !url || seenUrls.has(url)) return;
		seenUrls.add(url);
		results.push({
			position,
			title,
			url,
			snippet,
		});
		position += 1;
	};

	for (const renderer of collectRendererObjects(data, "videoRenderer")) {
		const videoId = typeof renderer.videoId === "string" ? renderer.videoId : null;
		const title = extractRunsText(renderer.title);
		const channel = extractRunsText(renderer.longBylineText);
		const viewCount = extractRunsText(renderer.viewCountText);
		const published = extractRunsText(renderer.publishedTimeText);
		const length = extractRunsText(renderer.lengthText);
		const description =
			extractRunsText(renderer.descriptionSnippet) ??
			extractRunsText(
				Array.isArray(renderer.detailedMetadataSnippets)
					? ((renderer.detailedMetadataSnippets as unknown[])[0] as Record<string, unknown> | undefined)?.snippetText
					: null,
			);
		const meta = [channel, viewCount, published, length].filter(Boolean).join(" · ");
		const snippet = [meta || null, description].filter(Boolean).join(" — ") || null;
		const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : extractNestedUrl(renderer);
		pushResult(title, url, snippet);
	}

	for (const renderer of collectRendererObjects(data, "channelRenderer")) {
		const title = extractRunsText(renderer.title);
		const url =
			extractNestedUrl(renderer) ??
			(typeof renderer.channelId === "string" ? `https://www.youtube.com/channel/${renderer.channelId}` : null);
		const subscribers = extractRunsText(renderer.subscriberCountText);
		const videos = extractRunsText(renderer.videoCountText);
		const description =
			extractRunsText(renderer.descriptionSnippet) ??
			extractRunsText(renderer.descriptionText);
		const meta = ["Channel", subscribers, videos].filter(Boolean).join(" · ");
		const snippet = [meta || null, description].filter(Boolean).join(" — ") || null;
		pushResult(title, url, snippet);
	}

	for (const renderer of collectRendererObjects(data, "playlistRenderer")) {
		const title = extractRunsText(renderer.title);
		const url = extractNestedUrl(renderer);
		const creator = extractRunsText(renderer.longBylineText);
		const videoCount = extractRunsText(renderer.videoCountShortText) ?? extractRunsText(renderer.videoCountText);
		const snippet = ["Playlist", creator, videoCount].filter(Boolean).join(" · ") || null;
		pushResult(title, url, snippet);
	}

	return results;
}

function extractYouTubeRelatedSearches(data: Record<string, unknown>): string[] {
	const related = new Set<string>();
	for (const renderer of collectRendererObjects(data, "searchRefinementCardRenderer")) {
		const query = extractRunsText(renderer.query);
		if (query) related.add(query);
	}
	for (const renderer of collectRendererObjects(data, "chipCloudChipRenderer")) {
		const text = extractRunsText(renderer.text);
		if (text && !/^all$/i.test(text)) related.add(text);
	}
	return [...related];
}

function extractYouTubeSearchQuery(url: string, doc: Document): string | null {
	try {
		const parsed = new URL(url);
		const query = parsed.searchParams.get("search_query");
		if (query) return query;
		const hashtagMatch = parsed.pathname.match(/^\/hashtag\/([^/?#]+)/);
		if (hashtagMatch?.[1]) return `#${decodeURIComponent(hashtagMatch[1])}`;
	} catch {
		// Ignore invalid URLs
	}
	return extractTitle(doc);
}

function parseYouTubeSearch(
	html: string,
	url: string,
	doc: Document,
): SearchResultsData {
	const ytData = extractYtInitialData(html);
	if (!ytData) {
		throw new Error("No YouTube search data found");
	}

	const results = extractYouTubeSearchResults(ytData);
	if (results.length === 0) {
		throw new Error("No YouTube search results found");
	}

	let totalResults: string | null = null;
	if (typeof ytData.estimatedResults === "string" && ytData.estimatedResults.trim()) {
		totalResults = ytData.estimatedResults.trim();
	}

	return {
		type: "search-results",
		title: extractTitle(doc),
		url,
		engine: "youtube",
		query: extractYouTubeSearchQuery(url, doc),
		results,
		relatedSearches: extractYouTubeRelatedSearches(ytData),
		featuredSnippet: totalResults ? { text: `${totalResults} results` } : null,
	};
}

interface ChannelMeta {
	description: string | null;
	subscriberCount: string | null;
	videoCount: string | null;
	joinedDate: string | null;
	country: string | null;
	channelLinks: string[];
	handle: string | null;
	bannerUrl: string | null;
	profileImageUrl: string | null;
}

/**
 * Walk into ytInitialData to extract channel metadata from the
 * c4TabbedHeaderRenderer and aboutChannelViewModel / channelAboutFullMetadataRenderer.
 */
function extractChannelMeta(data: Record<string, unknown>): ChannelMeta {
	const result: ChannelMeta = {
		description: null,
		subscriberCount: null,
		videoCount: null,
		joinedDate: null,
		country: null,
		channelLinks: [],
		handle: null,
		bannerUrl: null,
		profileImageUrl: null,
	};

	const json = JSON.stringify(data);

	// Subscriber count — already have a regex helper but let's also try from the parsed data
	const subMatch = json.match(/"subscriberCountText":\s*\{[^}]*?"simpleText":\s*"([^"]+)"/);
	if (subMatch?.[1]) result.subscriberCount = subMatch[1];

	// Video count from videosCountText
	const videoCountMatch = json.match(/"videosCountText":\s*\{[^}]*?"simpleText":\s*"([^"]+)"/);
	if (videoCountMatch?.[1]) result.videoCount = videoCountMatch[1];

	// Also try the aboutChannelViewModel format (newer YouTube pages)
	if (!result.videoCount) {
		const vmVideoCount = json.match(/"videoCountText":\s*"([^"]+)"/);
		if (vmVideoCount?.[1]) result.videoCount = vmVideoCount[1];
	}

	// Channel description from aboutChannelViewModel or channelAboutFullMetadataRenderer
	const descMatch = json.match(/"description":\s*\{[^}]*?"simpleText":\s*"((?:[^"\\]|\\.)*)"/);
	if (descMatch?.[1]) {
		try {
			result.description = JSON.parse(`"${descMatch[1]}"`);
		} catch {
			result.description = descMatch[1];
		}
	}

	// Also try the channelAboutFullMetadataRenderer description (different nesting)
	if (!result.description) {
		const descMatch2 = json.match(/"channelAboutFullMetadataRenderer":.+?"description":\s*\{[^}]*?"simpleText":\s*"((?:[^"\\]|\\.)*)"/);
		if (descMatch2?.[1]) {
			try {
				result.description = JSON.parse(`"${descMatch2[1]}"`);
			} catch {
				result.description = descMatch2[1];
			}
		}
	}

	// Joined date from aboutChannelViewModel
	const joinedMatch = json.match(/"joinedDateText":\s*\{[^}]*?"content":\s*"([^"]+)"/);
	if (joinedMatch?.[1]) {
		// Strip prefix like "Joined " if present
		result.joinedDate = joinedMatch[1].replace(/^Joined\s+/i, "");
	}

	// Also try the older format
	if (!result.joinedDate) {
		const joinedMatch2 = json.match(/"joinedDateText":\s*\{[^}]*?"simpleText":\s*"([^"]+)"/);
		if (joinedMatch2?.[1]) {
			result.joinedDate = joinedMatch2[1].replace(/^Joined\s+/i, "");
		}
	}

	// Country
	const countryMatch = json.match(/"country":\s*\{[^}]*?"simpleText":\s*"([^"]+)"/);
	if (countryMatch?.[1]) result.country = countryMatch[1];

	// Also try aboutChannelViewModel format
	if (!result.country) {
		const countryMatch2 = json.match(/"countryText":\s*\{[^}]*?"content":\s*"([^"]+)"/);
		if (countryMatch2?.[1]) result.country = countryMatch2[1];
	}

	// Channel links (external links like social media, websites)
	const linkMatches = json.matchAll(/"channelExternalLinkViewModel":.+?"link":\s*\{[^}]*?"content":\s*"([^"]+)"/g);
	for (const lm of linkMatches) {
		if (lm[1]) result.channelLinks.push(lm[1]);
	}

	// Also try the older primaryLinks format
	if (result.channelLinks.length === 0) {
		const primaryLinkMatches = json.matchAll(/"primaryLinkUrl":\s*"([^"]+)"/g);
		for (const lm of primaryLinkMatches) {
			if (lm[1]) {
				// These are often redirect URLs; extract the actual URL if possible
				try {
					const decoded = decodeURIComponent(lm[1]);
					const qMatch = decoded.match(/[?&]q=([^&]+)/);
					result.channelLinks.push(qMatch?.[1] ? decodeURIComponent(qMatch[1]) : decoded);
				} catch {
					result.channelLinks.push(lm[1]);
				}
			}
		}
	}

	// Channel @handle from vanityChannelUrl or channelHandleText
	const handleMatch = json.match(/"vanityChannelUrl":\s*"https?:\/\/(?:www\.)?youtube\.com\/@([^"]+)"/);
	if (handleMatch?.[1]) {
		result.handle = `@${handleMatch[1]}`;
	}
	if (!result.handle) {
		const handleTextMatch = json.match(/"channelHandleText":\s*\{[^}]*?"simpleText":\s*"(@[^"]+)"/);
		if (handleTextMatch?.[1]) result.handle = handleTextMatch[1];
	}

	// Banner image — try imageBannerViewModel.image.sources[] (new format) then banner.thumbnails[] (old)
	const bannerSourcesMatch = json.match(/"imageBannerViewModel":\s*\{"image":\s*\{"sources":\s*\[((?:[^[\]]|\[[^\]]*\])*?)\]/);
	const bannerThumbnailsMatch = !bannerSourcesMatch
		? json.match(/"banner":\s*\{"thumbnails":\s*\[((?:[^[\]]|\[[^\]]*\])*?)\]/)
		: null;
	const bannerRaw = bannerSourcesMatch?.[1] ?? bannerThumbnailsMatch?.[1];
	if (bannerRaw) {
		try {
			const thumbnails = JSON.parse(`[${bannerRaw}]`) as { url: string; width?: number }[];
			const best = thumbnails.at(-1);
			if (best?.url) result.bannerUrl = best.url;
		} catch {
			const urlMatch = bannerRaw.match(/"url":\s*"([^"]+)"/);
			if (urlMatch?.[1]) result.bannerUrl = urlMatch[1];
		}
	}

	// Profile/avatar image from c4TabbedHeaderRenderer.avatar.thumbnails (pick highest-res)
	const avatarMatch = json.match(/"avatar":\s*\{"thumbnails":\s*\[((?:[^[\]]|\[[^\]]*\])*?)\]/);
	if (avatarMatch?.[1]) {
		try {
			const thumbnails = JSON.parse(`[${avatarMatch[1]}]`) as { url: string; width?: number }[];
			const best = thumbnails.at(-1);
			if (best?.url) result.profileImageUrl = best.url;
		} catch {
			const urlMatch = avatarMatch[1].match(/"url":\s*"([^"]+)"/);
			if (urlMatch?.[1]) result.profileImageUrl = urlMatch[1];
		}
	}

	return result;
}

/**
 * Parse a voteCount string like "1.2K", "45", "1M" into a number.
 */
function parseVoteCount(raw: string): number | null {
	const cleaned = raw.replace(/,/g, "").trim();
	const m = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
	if (!m) return null;
	let n = Number.parseFloat(m[1] ?? "");
	if (Number.isNaN(n)) return null;
	const suffix = (m[2] ?? "").toUpperCase();
	if (suffix === "K") n *= 1_000;
	else if (suffix === "M") n *= 1_000_000;
	else if (suffix === "B") n *= 1_000_000_000;
	return Math.round(n);
}

/**
 * Extract comments from ytInitialData.
 * Comments live under twoColumnWatchNextResults > results > results > contents
 * in itemSectionRenderer > contents > commentThreadRenderer > comment > commentRenderer.
 * Note: comments are often lazily loaded and may not be present in SSR HTML.
 */
function extractComments(data: Record<string, unknown>): VideoComment[] {
	const comments: VideoComment[] = [];
	try {
		const twoCol = (data.contents as Record<string, unknown>)
			?.twoColumnWatchNextResults as Record<string, unknown>;
		const results = (twoCol?.results as Record<string, unknown>)
			?.results as Record<string, unknown>;
		const contents = results?.contents as Record<string, unknown>[];
		if (!Array.isArray(contents)) return comments;

		for (const section of contents) {
			const renderer = section?.itemSectionRenderer as Record<string, unknown>;
			if (!renderer) continue;
			const items = renderer.contents as Record<string, unknown>[];
			if (!Array.isArray(items)) continue;

			for (const item of items) {
				// continuationItemRenderer means comments are lazy-loaded
				const thread = item?.commentThreadRenderer as Record<string, unknown>;
				if (!thread) continue;
				const comment = (thread.comment as Record<string, unknown>)
					?.commentRenderer as Record<string, unknown>;
				if (!comment) continue;

				const id = typeof comment.commentId === "string" ? comment.commentId : null;
				const runs = (comment.contentText as Record<string, unknown>)?.runs as Record<string, unknown>[];
				const text = Array.isArray(runs)
					? runs.map(r => (typeof r.text === "string" ? r.text : "")).join("")
					: "";
				if (!text) continue;

				const authorObj = comment.authorText as Record<string, unknown> | undefined;
				const author = typeof authorObj?.simpleText === "string" ? authorObj.simpleText : null;

				const timeObj = comment.publishedTimeText as Record<string, unknown> | undefined;
				const timeRuns = timeObj?.runs as Record<string, unknown>[];
				const date = Array.isArray(timeRuns) && typeof timeRuns[0]?.text === "string"
					? timeRuns[0].text : null;

				const voteObj = comment.voteCount as Record<string, unknown> | undefined;
				const likesRaw = typeof voteObj?.simpleText === "string" ? voteObj.simpleText : null;
				const likes = likesRaw ? parseVoteCount(likesRaw) : null;

				const replyCount = typeof comment.replyCount === "number" ? comment.replyCount : null;

				comments.push({ id, author, text, likes, replyCount, date });
			}
		}
	} catch {
		// Silently handle traversal errors
	}

	if (comments.length > 0) return comments;

	const microformatComments = ((data.microformat as Record<string, unknown> | undefined)
		?.microformatDataRenderer as Record<string, unknown> | undefined)
		?.videoDetails as Record<string, unknown> | undefined;
	const rawComments = microformatComments?.comments;
	if (!Array.isArray(rawComments)) return comments;

	for (const entry of rawComments) {
		if (!entry || typeof entry !== "object") continue;
		const record = entry as Record<string, unknown>;
		const authorRecord = record.author as Record<string, unknown> | undefined;
		const authorName = typeof authorRecord?.name === "string" ? authorRecord.name : null;
		const alternateName = typeof authorRecord?.alternateName === "string"
			? authorRecord.alternateName
			: null;
		const text = typeof record.text === "string" ? record.text.trim() : "";
		if (!text) continue;
		const likes = typeof record.upvoteCount === "number"
			? record.upvoteCount
			: typeof record.upvoteCount === "string"
				? parseVoteCount(record.upvoteCount)
				: null;
		const date = typeof record.dateCreated === "string" ? record.dateCreated : null;
		comments.push({
			id: null,
			author: authorName ?? alternateName,
			text,
			likes,
			replyCount: null,
			date,
		});
	}

	return comments;
}

export function parseYouTube(html: string, url: string): VideoData | SearchResultsData {
	const doc = parseDocument(html);

	const parsedUrl = new URL(url);
	const pathname = parsedUrl.pathname;

	if (
		pathname.startsWith("/results")
		|| pathname.startsWith("/hashtag/")
		|| pathname.startsWith("/feed/explore")
		|| pathname.startsWith("/feed/trending")
	) {
		return parseYouTubeSearch(html, url, doc);
	}

	if (pathname.startsWith("/watch")) {
		// ── Video page ─────────────────────────────────────────────────────
		const name = getContent('meta[itemprop="name"]', doc);
		if (!name) throw new Error("No YouTube content found");

		// Channel / author
		const authorEl = selectOne('[itemprop="author"]', doc) as Element | null;
		let channel: string | null = null;
		let channelUrl: string | null = null;
		if (authorEl) {
			channel = getContent('[itemprop="name"]', authorEl);
			channelUrl = getHref('[itemprop="url"]', authorEl);
		}

		const uploadDate = getContent('meta[itemprop="uploadDate"]', doc);
		const durationRaw = getContent('meta[itemprop="duration"]', doc);
		const genre = getContent('meta[itemprop="genre"]', doc);

		// View count and like count
		let viewCount: number | null = null;
		let likeCount: number | null = null;
		const statEls = selectAll('[itemprop="interactionStatistic"]', doc) as unknown as Element[];
		for (const stat of statEls) {
			const interactionType = getContent('[itemprop="interactionType"]', stat);
			const count = getContent('[itemprop="userInteractionCount"]', stat);
			if (!interactionType || !count) continue;
			const n = Number.parseInt(count, 10);
			if (interactionType.includes("WatchAction") && !Number.isNaN(n)) {
				viewCount = n;
			} else if (interactionType.includes("LikeAction") && !Number.isNaN(n)) {
				likeCount = n;
			}
		}

		// Full description
		const fullDesc = extractFullDescription(html);
		const itempropDesc = getContent('meta[itemprop="description"]', doc);
		const description = fullDesc || itempropDesc;

		// Comments from ytInitialData (may be empty if lazily loaded)
		const ytData = extractYtInitialData(html);
		const comments = ytData ? extractComments(ytData) : [];

		const result: VideoData = {
			type: "video",
			title: extractTitle(doc),
			url,
			platform: "youtube",
			channel,
			channelUrl,
			uploadDate,
			duration: durationRaw,
			viewCount,
			likeCount,
			genre,
			description: description ?? null,
		};
		if (comments.length > 0) result.comments = comments;
		return result;
	}

	if (pathname.startsWith("/@") || pathname.startsWith("/channel/") || pathname.startsWith("/c/") || pathname.startsWith("/user/")) {
		// ── Channel page ───────────────────────────────────────────────────
		const name = getContent('meta[itemprop="name"]', doc);

		// Extract rich metadata from ytInitialData
		const ytData = extractYtInitialData(html);
		const channelMeta = ytData ? extractChannelMeta(ytData) : null;

		// Subscriber count: prefer parsed data, fall back to regex on raw HTML
		const subscriberCount = channelMeta?.subscriberCount || extractSubscriberCount(html);

		// Description: prefer full description from ytInitialData, fall back to meta tag
		const metaDesc = getContent('meta[itemprop="description"]', doc);
		const description = channelMeta?.description || metaDesc;

		// Handle: prefer ytInitialData, fall back to URL path
		let handle = channelMeta?.handle ?? null;
		if (!handle && pathname.startsWith("/@")) {
			handle = `@${pathname.slice(2).replace(/\/.*$/, "")}`;
		}

		if (!name && !subscriberCount) throw new Error("No YouTube content found");

		const result: VideoData = {
			type: "video",
			title: name,
			url,
			platform: "youtube",
			channel: name,
			channelUrl: url,
			uploadDate: null,
			duration: null,
			viewCount: null,
			likeCount: null,
			genre: null,
			description: description ?? null,
		};
		if (subscriberCount) result.subscriberCount = subscriberCount;
		if (channelMeta?.videoCount) result.videoCount = channelMeta.videoCount;
		if (channelMeta?.joinedDate) result.joinedDate = channelMeta.joinedDate;
		if (channelMeta?.country) result.country = channelMeta.country;
		if (channelMeta?.channelLinks && channelMeta.channelLinks.length > 0) {
			result.channelLinks = channelMeta.channelLinks;
		}
		if (handle) result.handle = handle;
		if (channelMeta?.bannerUrl) result.bannerUrl = channelMeta.bannerUrl;
		if (channelMeta?.profileImageUrl) result.profileImageUrl = channelMeta.profileImageUrl;
		return result;
	}

	// Generic YouTube page — fall back to og: meta tags
	const ogTitle = getMeta(doc, "og:title");
	const ogDescription = getMeta(doc, "og:description");
	const title = ogTitle || extractTitle(doc);

	if (!title && !ogDescription) throw new Error("No YouTube content found");

	return {
		type: "video",
		title,
		url,
		platform: "youtube",
		channel: null,
		channelUrl: null,
		uploadDate: null,
		duration: null,
		viewCount: null,
		likeCount: null,
		genre: null,
		description: ogDescription !== title ? (ogDescription ?? null) : null,
	};
}
