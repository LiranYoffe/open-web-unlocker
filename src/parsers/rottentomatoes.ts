/**
 * rottentomatoes.ts — Parser for Rotten Tomatoes movie/TV pages.
 *
 * URL patterns:
 *   Movie:  /m/<slug>
 *   TV:     /tv/<slug>
 *
 * Extraction priority:
 *   1. `media-scorecard-json` script (criticsScore, audienceScore, description)
 *   2. JSON-LD Movie schema (name, actors, director, genre, contentRating, dateCreated)
 *   3. og:* meta tags as fallback
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { FilmCastEntry, FilmData } from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	if (el) return getAttributeValue(el, "content") ?? null;
	const named = selectOne(`meta[name="${property}"]`, doc) as Element | null;
	return named ? (getAttributeValue(named, "content") ?? null) : null;
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
			// skip
		}
	}
	return results;
}

function stringVal(v: unknown): string | null {
	return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Convert string or number to string, null for empty/undefined. */
function toStr(v: unknown): string | null {
	if (typeof v === "number") return String(v);
	return stringVal(v);
}

function parsePersonList(list: unknown): string | null {
	if (Array.isArray(list)) {
		const names = list
			.map((p) => {
				const obj = p as Record<string, unknown>;
				return typeof obj.name === "string" ? obj.name : null;
			})
			.filter(Boolean);
		return names.length > 0 ? names.join(", ") : null;
	}
	if (typeof list === "object" && list !== null) {
		const obj = list as Record<string, unknown>;
		return typeof obj.name === "string" ? obj.name : null;
	}
	return null;
}

// ── Scorecard JSON ───────────────────────────────────────────────────────────

interface ScorecardData {
	criticsScore: string | null;
	criticsAvg: string | null;
	criticsCount: string | null;
	audienceScore: string | null;
	audienceAvg: string | null;
	audienceCount: string | null;
	description: string | null;
}

function extractScorecard(doc: Document): ScorecardData {
	const result: ScorecardData = {
		criticsScore: null,
		criticsAvg: null,
		criticsCount: null,
		audienceScore: null,
		audienceAvg: null,
		audienceCount: null,
		description: null,
	};

	const script = selectOne(
		'script[id="media-scorecard-json"]',
		doc,
	) as Element | null;
	if (!script) return result;

	const raw = textContent(script).trim();
	if (!raw) return result;

	let data: Record<string, unknown>;
	try {
		data = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return result;
	}

	// Critics score
	const critics = data.criticsScore as Record<string, unknown> | undefined;
	if (critics) {
		result.criticsScore = toStr(critics.score);
		result.criticsAvg = toStr(critics.averageRating);
		result.criticsCount = toStr(critics.reviewCount);
	}

	// Audience score (prefer verified, fallback to overlay.audienceAll)
	const audience = data.audienceScore as Record<string, unknown> | undefined;
	if (audience) {
		result.audienceScore = toStr(audience.score);
		result.audienceAvg = toStr(audience.averageRating);
		result.audienceCount = toStr(audience.reviewCount);
	}

	// Overlay has audienceAll (all ratings, not just verified)
	if (!result.audienceScore) {
		const overlay = data.overlay as Record<string, unknown> | undefined;
		const audienceAll = overlay?.audienceAll as
			| Record<string, unknown>
			| undefined;
		if (audienceAll) {
			result.audienceScore = toStr(audienceAll.score);
			result.audienceAvg = toStr(audienceAll.averageRating);
			result.audienceCount = toStr(audienceAll.reviewCount);
		}
	}

	result.description = stringVal(data.description);
	return result;
}

// ── Main parser ──────────────────────────────────────────────────────────────

const RT_FILM_TYPES = new Set([
	"Movie",
	"TVSeries",
	"TVEpisode",
	"TVMiniSeries",
]);

export function parseRottenTomatoes(html: string, url: string): FilmData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// 1. Scorecard JSON (RT-specific structured data)
	const scorecard = extractScorecard(doc);

	// 2. JSON-LD Movie schema
	const jsonLdItems = extractJsonLd(doc);
	let name: string | null = null;
	let contentType: string | null = null;
	let contentRating: string | null = null;
	let description: string | null = scorecard.description;
	let genre: string[] = [];
	let actorList: string | null = null;
	const cast: FilmCastEntry[] = [];
	let director: string | null = null;
	let datePublished: string | null = null;

	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		const type = typeof obj["@type"] === "string" ? obj["@type"] : null;
		if (!type || !RT_FILM_TYPES.has(type)) continue;

		contentType = type;
		const rawName = stringVal(obj.name);
		if (rawName) {
			// Strip year suffix like "(2023)"
			name = rawName.replace(/\s*\(\d{4}\)$/, "").trim();
		}
		contentRating = stringVal(obj.contentRating);
		if (!description) description = stringVal(obj.description);

		const genreRaw = obj.genre;
		if (Array.isArray(genreRaw)) genre = genreRaw as string[];
		else if (typeof genreRaw === "string") genre = [genreRaw];

		actorList = parsePersonList(obj.actor);
		director = parsePersonList(obj.director);
		datePublished = stringVal(obj.dateCreated);

		// Build cast list from JSON-LD actors (no character info in RT)
		if (Array.isArray(obj.actor)) {
			for (const a of obj.actor as Record<string, unknown>[]) {
				const actorName = stringVal(a.name);
				if (actorName) cast.push({ actor: actorName, character: null });
			}
		}
		break;
	}

	// 3. Fallbacks from og: meta tags
	if (!name) {
		const ogTitle = getMeta(doc, "og:title");
		if (ogTitle) {
			name = ogTitle
				.replace(/\s*\(\d{4}\)$/, "")
				.replace(/\s*\|\s*Rotten Tomatoes$/, "")
				.trim();
		}
	}
	if (!description) {
		description = getMeta(doc, "og:description");
	}

	if (!name && !description) {
		throw new Error("No Rotten Tomatoes content found");
	}

	return {
		type: "film",
		platform: "rottentomatoes",
		title: name || pageTitle,
		url,
		contentType,
		description,
		contentRating,
		rating: scorecard.criticsScore,
		ratingCount: scorecard.criticsCount,
		audienceScore: scorecard.audienceScore,
		genre,
		actorList,
		cast,
		director,
		datePublished,
	};
}
