import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { FilmCastEntry, FilmData, FilmReview, ImdbPersonData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
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
			// Ignore
		}
	}
	return results;
}

const IMDB_FILM_TYPES = new Set(["Movie", "TVSeries", "TVEpisode", "TVMiniSeries", "TVMovie"]);

function parsePerson(person: unknown): string | null {
	if (!person || typeof person !== "object") return null;
	const p = person as Record<string, unknown>;
	return typeof p.name === "string" ? p.name : null;
}

function parsePersonList(list: unknown): string {
	if (Array.isArray(list)) {
		return list.map(parsePerson).filter(Boolean).join(", ");
	}
	return parsePerson(list) ?? "";
}

/** Extract text from all matching elements, joined. */
function getAllText(selector: string, root: Document | Element): string[] {
	const els = selectAll(selector, root) as unknown as Element[];
	return els.map((e) => textContent(e).trim()).filter(Boolean);
}

/** Get a metadata list item value by its data-testid. */
function getMetaItem(testId: string, doc: Document): string | null {
	const el = selectOne(`[data-testid="${testId}"]`, doc) as Element | null;
	if (!el) return null;
	const content = selectOne(".ipc-metadata-list-item__content-container", el) as Element | null;
	return content ? textContent(content).trim() || null : null;
}

export function parseImdb(html: string, url: string): FilmData | ImdbPersonData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// ── 1. JSON-LD ─────────────────────────────────────────────────────────────
	const jsonLdItems = extractJsonLd(doc);
	// Flatten top-level items and their mainEntity (IMDB wraps Person in Article.mainEntity)
	const flatItems: unknown[] = [];
	for (const item of jsonLdItems) {
		flatItems.push(item);
		const maybeArticle = item as Record<string, unknown>;
		if (maybeArticle.mainEntity) flatItems.push(maybeArticle.mainEntity);
	}

	for (const item of flatItems) {
		const obj = item as Record<string, unknown>;
		const type = obj["@type"];
		if (typeof type !== "string") continue;

		// ── Person page ─────────────────────────────────────────────────────
		if (type === "Person") {
			const name = typeof obj.name === "string" ? obj.name : null;

			let occupation: string | null = null;
			const jobTitleRaw = obj.jobTitle;
			if (Array.isArray(jobTitleRaw) && jobTitleRaw.length > 0) {
				occupation = (jobTitleRaw as string[]).join(", ");
			} else if (typeof jobTitleRaw === "string") {
				occupation = jobTitleRaw;
			}

			const birthDate = typeof obj.birthDate === "string" ? obj.birthDate : null;

			// Full bio from DOM
			const bioEl = selectOne('[data-testid="bio-content"]', doc) as Element | null;
			const domBio = bioEl ? textContent(bioEl).trim() || null : null;
			const jsonLdDesc = typeof obj.description === "string" ? obj.description : null;
			const bio = domBio ?? jsonLdDesc;

			if (!name && !bio) throw new Error("No IMDB person content found");

			return {
				type: "film-person",
				title: name || pageTitle,
				url,
				name,
				bio,
				occupation,
				birthDate,
			};
		}

		// ── Film / TV page ──────────────────────────────────────────────────
		if (IMDB_FILM_TYPES.has(type)) {
			const name = typeof obj.name === "string" ? obj.name : null;
			const contentRating = typeof obj.contentRating === "string" ? obj.contentRating : null;
			const description = typeof obj.description === "string" ? obj.description : null;

			// Rating
			const ratingObj = obj.aggregateRating as Record<string, unknown> | undefined;
			let rating: string | null = null;
			let ratingCount: string | null = null;
			if (ratingObj) {
				if (ratingObj.ratingValue != null) rating = String(ratingObj.ratingValue);
				if (ratingObj.ratingCount != null) ratingCount = String(ratingObj.ratingCount);
			}

			// Genre
			let genre: string[] = [];
			const genreRaw = obj.genre;
			if (Array.isArray(genreRaw)) genre = genreRaw as string[];
			else if (typeof genreRaw === "string") genre = [genreRaw];

			// Keywords
			let keywords: string | null = null;
			if (typeof obj.keywords === "string") {
				const kws = (obj.keywords as string)
					.split(",")
					.map((k) => k.trim())
					.filter(Boolean)
					.join(", ");
				if (kws) keywords = kws;
			}

			// Director / writers
			const directorStr = parsePersonList(obj.director) || null;
			let writersStr: string | null = null;
			if (Array.isArray(obj.creator)) {
				const writers = (obj.creator as unknown[]).map(parsePerson).filter(Boolean).join(", ");
				if (writers) writersStr = writers;
			}

			// Cast (flat list from JSON-LD)
			const actorListStr = parsePersonList(obj.actor) || null;

			const datePublished = typeof obj.datePublished === "string" ? obj.datePublished : null;
			const duration = typeof obj.duration === "string" ? obj.duration : null;

			// Review
			let review: FilmReview | null = null;
			const reviewRaw = obj.review as Record<string, unknown> | undefined;
			if (reviewRaw && reviewRaw["@type"] === "Review") {
				const reviewBody = typeof reviewRaw.reviewBody === "string" ? reviewRaw.reviewBody : null;
				if (reviewBody) {
					review = {
						name: typeof reviewRaw.name === "string" ? reviewRaw.name : null,
						author: parsePerson(reviewRaw.author),
						body: reviewBody.replace(/\n{3,}/g, "\n\n").trim(),
					};
				}
			}

			// ── 2. DOM augmentation ───────────────────────────────────────────

			// Metacritic score
			const metacriticEl = selectOne(".metacritic-score-box", doc) as Element | null;
			const metacriticScore = metacriticEl ? textContent(metacriticEl).trim() : null;

			// Cast with character names
			const castItems = selectAll('[data-testid="title-cast-item"]', doc) as unknown as Element[];
			const cast: FilmCastEntry[] = [];
			for (const castItem of castItems.slice(0, 10)) {
				const actorEl = selectOne('[data-testid="title-cast-item__actor"]', castItem) as Element | null;
				const charEl = selectOne('[data-testid="cast-item-characters-link"]', castItem) as Element | null;
				const actorName = actorEl ? textContent(actorEl).trim() : null;
				const charName = charEl ? textContent(charEl).trim() : null;
				if (actorName) cast.push({ actor: actorName, character: charName });
			}

			const boxOffice = {
				budget: getMetaItem("title-boxoffice-budget", doc),
				grossDomestic: getMetaItem("title-boxoffice-grossdomestic", doc),
				openingWeekend: getMetaItem("title-boxoffice-openingweekenddomestic", doc),
			};

			const techSpecs = {
				runtime: getMetaItem("title-techspec_runtime", doc),
				color: getMetaItem("title-techspec_color", doc),
				sound: getMetaItem("title-techspec_soundmix", doc),
				aspectRatio: getMetaItem("title-techspec_aspectratio", doc),
			};

			const languages = getAllText(
				'[data-testid="title-details-languages"] .ipc-metadata-list-item__list-content-item',
				doc,
			);
			const details = {
				releaseDate: getMetaItem("title-details-releasedate", doc),
				country: getMetaItem("title-details-origin", doc),
				languages,
				akas: getMetaItem("title-details-akas", doc),
			};

			return {
				type: "film",
				platform: "imdb",
				title: name || pageTitle,
				url,
				contentType: type,
				description,
				contentRating,
				rating,
				ratingCount,
				audienceScore: null,
				genre,
				keywords,
				actorList: actorListStr,
				cast,
				director: directorStr,
				writers: writersStr,
				datePublished,
				duration,
				metacriticScore,
				boxOffice,
				techSpecs,
				details,
				review,
			};
		}
	}

	// ── 3. Fallback: data-testid DOM selectors (no JSON-LD available) ──────────
	const titleEl = selectOne("h1[data-testid='hero-title-block__title']", doc) as Element | null;
	const titleText = titleEl ? textContent(titleEl).trim() : null;

	const plotEl =
		(selectOne("[data-testid='plot-xs_to_m']", doc) as Element | null) ??
		(selectOne("[data-testid='plot']", doc) as Element | null);
	const plotText = plotEl ? textContent(plotEl).trim() : null;

	const genreLinks = getAllText('[data-testid="genres"] a', doc);

	let ogFallbackTitle: string | null = null;
	let ogFallbackDesc: string | null = null;
	if (!titleText && !plotText) {
		const ogTitle = selectOne('meta[property="og:title"]', doc) as Element | null;
		const ogDesc = selectOne('meta[property="og:description"]', doc) as Element | null;
		ogFallbackTitle = ogTitle ? (getAttributeValue(ogTitle, "content") ?? null) : null;
		ogFallbackDesc = ogDesc ? (getAttributeValue(ogDesc, "content") ?? null) : null;
	}

	if (!titleText && !plotText && !ogFallbackTitle) {
		throw new Error("No IMDB content found");
	}

	return {
		type: "film",
		platform: "imdb",
		title: titleText || ogFallbackTitle || pageTitle,
		url,
		contentType: null,
		description: plotText || ogFallbackDesc,
		contentRating: null,
		rating: null,
		ratingCount: null,
		audienceScore: null,
		genre: genreLinks,
		keywords: null,
		actorList: null,
		cast: [],
		director: null,
		writers: null,
		datePublished: null,
		duration: null,
		metacriticScore: null,
		boxOffice: { budget: null, grossDomestic: null, openingWeekend: null },
		techSpecs: { runtime: null, color: null, sound: null, aspectRatio: null },
		details: { releaseDate: null, country: null, languages: [], akas: null },
		review: null,
	};
}
