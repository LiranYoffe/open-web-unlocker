/**
 * metacritic.ts — Parser for Metacritic movie/TV/game/music pages.
 *
 * URL patterns:
 *   Movie: /movie/<slug>
 *   TV:    /tv/<slug>
 *   Game:  /game/<slug>
 *   Music: /music/<slug>
 *
 * Extraction priority:
 *   1. JSON-LD Movie/TVSeries schema (name, Metascore, actors, director, genre, etc.)
 *   2. og:* meta tags as fallback
 *
 * Note: Metacritic uses Nuxt 3 with __NUXT_DATA__ (indexed array hydration format)
 * which is too complex to reliably parse. We rely on JSON-LD and meta tags instead.
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

// ── Main parser ──────────────────────────────────────────────────────────────

const MC_FILM_TYPES = new Set([
	"Movie",
	"TVSeries",
	"TVEpisode",
	"TVMiniSeries",
	"TVSeason",
]);

export function parseMetacritic(html: string, url: string): FilmData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	const jsonLdItems = extractJsonLd(doc);
	let name: string | null = null;
	let contentType: string | null = null;
	let contentRating: string | null = null;
	let description: string | null = null;
	let rating: string | null = null;
	let ratingCount: string | null = null;
	let genre: string[] = [];
	let actorList: string | null = null;
	const cast: FilmCastEntry[] = [];
	let director: string | null = null;
	let datePublished: string | null = null;
	let duration: string | null = null;

	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		const type = typeof obj["@type"] === "string" ? obj["@type"] : null;
		if (!type || !MC_FILM_TYPES.has(type)) continue;

		contentType = type;
		name = stringVal(obj.name);
		contentRating = stringVal(obj.contentRating);
		description = stringVal(obj.description);
		datePublished = stringVal(obj.datePublished);

		// Note: obj.duration is the trailer duration, not the movie runtime.
		// The actual runtime is in the __NUXT_DATA__ payload which we don't parse.

		// Genre
		const genreRaw = obj.genre;
		if (Array.isArray(genreRaw)) genre = genreRaw as string[];
		else if (typeof genreRaw === "string") genre = [genreRaw];

		// Aggregate rating (Metascore)
		const aggRating = obj.aggregateRating as
			| Record<string, unknown>
			| undefined;
		if (aggRating) {
			const ratingVal = aggRating.ratingValue;
			if (typeof ratingVal === "number") rating = String(ratingVal);
			else if (typeof ratingVal === "string") rating = ratingVal;

			const countVal = aggRating.reviewCount ?? aggRating.ratingCount;
			if (typeof countVal === "number") ratingCount = String(countVal);
			else if (typeof countVal === "string") ratingCount = countVal;
		}

		// Actors
		actorList = parsePersonList(obj.actor);
		if (Array.isArray(obj.actor)) {
			for (const a of (obj.actor as Record<string, unknown>[]).slice(
				0,
				10,
			)) {
				const actorName = stringVal(a.name);
				if (actorName) cast.push({ actor: actorName, character: null });
			}
		}

		// Director
		director = parsePersonList(obj.director);
		break;
	}

	// Fallbacks from og: meta tags
	if (!name) {
		const ogTitle = getMeta(doc, "og:title");
		if (ogTitle) {
			name = ogTitle
				.replace(/\s*Reviews?\s*[-–—]\s*Metacritic$/i, "")
				.replace(/\s*\|\s*Metacritic$/i, "")
				.trim();
		}
	}
	if (!description) {
		description = getMeta(doc, "og:description");
	}

	if (!name && !description) {
		throw new Error("No Metacritic content found");
	}

	return {
		type: "film",
		platform: "metacritic",
		title: name || pageTitle,
		url,
		contentType,
		description,
		contentRating,
		rating,
		ratingCount,
		genre,
		actorList,
		cast,
		director,
		datePublished,
		duration,
	};
}
