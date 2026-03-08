import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { VideoData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	if (!el) return null;
	const raw = textContent(el).trim();
	return raw.replace(/\s*[|–-]\s*Vimeo\s*$/, "").trim() || null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	if (el) return getAttributeValue(el, "content")?.trim() || null;
	// Fall back to name attribute (twitter:title, description, etc.)
	const byName = selectOne(`meta[name="${property}"]`, doc) as Element | null;
	return byName ? (getAttributeValue(byName, "content")?.trim() || null) : null;
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

function findByType(items: unknown[], type: string): Record<string, unknown> | null {
	for (const item of items) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] === type) return obj;
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

/** Extract clip data from Vimeo's __NEXT_DATA__ or inline props script */
function extractNextDataClip(doc: Document): Record<string, unknown> | null {
	// Try __NEXT_DATA__ script first
	const nextData = selectOne('script#__NEXT_DATA__', doc) as Element | null;
	if (nextData) {
		try {
			const parsed = JSON.parse(textContent(nextData)) as Record<string, unknown>;
			const props = parsed.props as Record<string, unknown> | undefined;
			const pageProps = props?.pageProps as Record<string, unknown> | undefined;
			const clip = pageProps?.clip as Record<string, unknown> | undefined;
			if (clip) return clip;
		} catch {
			// Ignore
		}
	}
	// Scan inline scripts for {"props":{"pageProps": pattern
	const scripts = selectAll("script:not([src])", doc) as unknown as Element[];
	for (const script of scripts) {
		const raw = textContent(script).trim();
		if (!raw.includes('"pageProps"')) continue;
		try {
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			const props = parsed.props as Record<string, unknown> | undefined;
			const pageProps = props?.pageProps as Record<string, unknown> | undefined;
			const clip = pageProps?.clip as Record<string, unknown> | undefined;
			if (clip) return clip;
		} catch {
			// Not JSON or wrong shape
		}
	}
	return null;
}

export function parseVimeo(html: string, url: string): VideoData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// ── JSON-LD VideoObject (Vimeo embeds this in static HTML) ───────────
	const jsonLdItems = extractJsonLd(doc);
	const video = findByType(jsonLdItems, "VideoObject");

	if (video) {
		const name = stringVal(video.name);

		const author = video.author as Record<string, unknown> | undefined;
		const channel = author ? stringVal(author.name) : null;
		const channelUrl = author ? stringVal(author.url) : null;

		const uploadDate = stringVal(video.uploadDate);
		const duration = stringVal(video.duration);
		const description = stringVal(video.description);

		// View count + like count from interactionStatistic
		let viewCount: number | null = null;
		let likeCount: number | null = null;
		const stats = video.interactionStatistic;
		const statArr = Array.isArray(stats) ? stats : stats ? [stats] : [];
		for (const stat of statArr as Record<string, unknown>[]) {
			const count = stat.userInteractionCount;
			const type = stat.interactionType as Record<string, unknown> | string | undefined;
			const typeStr =
				typeof type === "string" ? type : (type?.["@type"] as string | undefined) ?? "";
			if (count === undefined) continue;
			const n = Number(count);
			if (Number.isNaN(n)) continue;
			if (typeStr.includes("WatchAction")) viewCount = n;
			else if (typeStr.includes("LikeAction")) likeCount = n;
		}

		return {
			type: "video",
			title: name || pageTitle,
			url,
			platform: "vimeo",
			channel,
			channelUrl,
			uploadDate,
			duration,
			viewCount,
			likeCount,
			description,
		};
	}

	// ── Inline __NEXT_DATA__ / props fallback ────────────────────────
	const clipData = extractNextDataClip(doc);
	let fbChannel: string | null = null;
	let fbChannelUrl: string | null = null;
	let fbUploadDate: string | null = null;
	let fbDuration: string | null = null;
	let fbDescription: string | null = null;

	if (clipData) {
		const user = clipData.user as Record<string, unknown> | undefined;
		fbChannel = user ? stringVal(user.name) : null;
		fbChannelUrl = user ? stringVal(user.link) : null;
		fbUploadDate = stringVal(clipData.created_time) ?? stringVal(clipData.release_time);
		const dur = clipData.duration;
		if (typeof dur === "number" && dur > 0) {
			// Convert seconds to ISO 8601 duration
			const h = Math.floor(dur / 3600);
			const m = Math.floor((dur % 3600) / 60);
			const s = dur % 60;
			fbDuration = `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}${s > 0 ? `${s}S` : ""}`;
		}
		fbDescription = stringVal(clipData.description);
	}

	// ── og: fallback ──────────────────────────────────────────────────
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");
	const titleText = ogTitle || pageTitle;

	if (!titleText && !ogDesc) {
		throw new Error("No Vimeo content found");
	}

	const fallbackDesc = fbDescription ?? (ogDesc !== titleText ? ogDesc : null);

	return {
		type: "video",
		title: titleText,
		url,
		platform: "vimeo",
		channel: fbChannel,
		channelUrl: fbChannelUrl,
		uploadDate: fbUploadDate,
		duration: fbDuration,
		viewCount: null,
		likeCount: null,
		description: fallbackDesc,
	};
}
