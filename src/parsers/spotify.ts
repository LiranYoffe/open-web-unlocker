import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { MusicData, MusicTrackListEntry } from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	if (!el) return null;
	const raw = textContent(el).trim();
	// Strip " | Spotify" or " - song and lyrics by ... | Spotify" suffix
	return raw.replace(/\s*[|]\s*Spotify\s*$/i, "").trim() || null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	if (el) return getAttributeValue(el, "content")?.trim() || null;
	const byName = selectOne(`meta[name="${property}"]`, doc) as Element | null;
	return byName ? (getAttributeValue(byName, "content")?.trim() || null) : null;
}

function extractGenres(doc: Document, root?: Document | Element | null): string[] {
	const scope = root ?? doc;
	const genres = new Set<string>();

	const genreLinks = selectAll('a[href*="/genre/"], a[href*="/genres/"]', scope) as unknown as Element[];
	for (const link of genreLinks) {
		const text = textContent(link).replace(/\s+/g, " ").trim();
		if (text && text.length < 80) genres.add(text);
	}

	const keywords = getMeta(doc, "keywords");
	if (keywords) {
		for (const keyword of keywords.split(",")) {
			const cleaned = keyword.replace(/\s+/g, " ").trim();
			if (cleaned && /soundtrack|score|classical|pop|rock|jazz|hip hop|hip-hop|electronic|ambient|metal|folk|country|blues|r&b|indie/i.test(cleaned)) {
				genres.add(cleaned);
			}
		}
	}

	return [...genres];
}

/** Detect Spotify page type from URL path */
function detectPageType(url: string): "track" | "album" | "artist" | "playlist" | "unknown" {
	try {
		const path = new URL(url).pathname;
		if (path.startsWith("/track/")) return "track";
		if (path.startsWith("/album/")) return "album";
		if (path.startsWith("/artist/")) return "artist";
		if (path.startsWith("/playlist/")) return "playlist";
	} catch {
		// ignore
	}
	return "unknown";
}

// ── Tracklist extraction ─────────────────────────────────────────────────────

/**
 * Extract tracks from a Spotify tracklist element.
 * Each row has columns: [track#/play btn] [track name] [play count] [duration]
 * identified by aria-colindex attributes.
 */
function extractTracklist(trackListEl: Element): MusicTrackListEntry[] {
	const rows = selectAll('[data-testid="tracklist-row"]', trackListEl) as unknown as Element[];
	const tracks: MusicTrackListEntry[] = [];

	for (const row of rows) {
		// Track name from internal-track-link
		const trackLink = selectOne('[data-testid="internal-track-link"]', row) as Element | null;
		const name = trackLink ? textContent(trackLink).trim() : null;
		if (!name) continue;

		// Artist from aria-label on the play button: "Play [Track] by [Artist]"
		let artist = "";
		const playBtn = selectOne('button[aria-label^="Play "]', row) as Element | null;
		if (playBtn) {
			const label = getAttributeValue(playBtn, "aria-label") || "";
			const byMatch = label.match(/\sby\s(.+)$/);
			if (byMatch?.[1]) artist = byMatch[1].trim();
		}

		// Duration: last text content in aria-colindex="4" that looks like time (m:ss)
		const col4 = selectOne('[aria-colindex="4"]', row) as Element | null;
		let duration: string | null = null;
		if (col4) {
			const fullText = textContent(col4).trim();
			const durMatch = fullText.match(/(\d{1,3}:\d{2})\s*$/);
			if (durMatch?.[1]) duration = durMatch[1];
		}

		tracks.push({ name, artist, duration });
	}

	return tracks;
}

// ── Track page ───────────────────────────────────────────────────────────────

function parseTrackPage(doc: Document, url: string, pageTitle: string | null): MusicData {
	const container = selectOne('[data-testid="track-page"]', doc) as Element | null;
	const genre = extractGenres(doc, container);

	// Track name
	const entityTitle = selectOne('[data-testid="entityTitle"]', container ?? doc) as Element | null;
	const name = entityTitle ? textContent(entityTitle).trim() : null;

	// Artist from creator-link
	const creatorLink = selectOne('[data-testid="creator-link"]', container ?? doc) as Element | null;
	const artist = creatorLink ? textContent(creatorLink).trim() : null;

	// Album from album link
	const albumLink = selectOne('a[href*="/album/"]', container ?? doc) as Element | null;
	const album = albumLink ? textContent(albumLink).trim() : null;

	// Release date
	const releaseDateEl = selectOne('[data-testid="release-date"]', container ?? doc) as Element | null;
	const releaseDate = releaseDateEl ? textContent(releaseDateEl).trim() : null;

	// Play count
	const playcountEl = selectOne('[data-testid="playcount"]', container ?? doc) as Element | null;
	const playCount = playcountEl ? textContent(playcountEl).trim() : null;

	// Duration: find in the track-page header area
	// The duration is a span near release-date and playcount, typically like "3:33"
	let duration: string | null = null;
	if (container) {
		const spans = selectAll("span", container) as unknown as Element[];
		for (const span of spans) {
			const text = textContent(span).trim();
			if (/^\d{1,3}:\d{2}$/.test(text)) {
				duration = text;
				break;
			}
		}
	}

	// Album art: first image from scdn.co
	let albumArt: string | null = null;
	if (container) {
		const img = selectOne('img[src*="i.scdn.co"]', container) as Element | null;
		if (img) albumArt = getAttributeValue(img, "src") || null;
	}

	// Track list from the album section (second track-list on page has numbered tracks)
	const trackLists = selectAll('[data-testid="track-list"]', container ?? doc) as unknown as Element[];
	let trackList: MusicTrackListEntry[] = [];
	// The album tracklist typically has numbered tracks (1, 2, 3...)
	// It's usually the second track-list on a track page (first is "fans also like")
	for (const tl of trackLists) {
		const firstRow = selectOne('[data-testid="tracklist-row"]', tl) as Element | null;
		if (!firstRow) continue;
		// Check if the first column has a number (album tracks are numbered)
		const col1 = selectOne('[aria-colindex="1"]', firstRow) as Element | null;
		if (col1) {
			const col1Text = textContent(col1).trim();
			if (/^\d+$/.test(col1Text)) {
				trackList = extractTracklist(tl);
				break;
			}
		}
	}

	// Track number: find current track in the album tracklist
	let trackNumber: number | null = null;
	if (trackList.length > 0 && name) {
		const idx = trackList.findIndex(
			(t) => t.name.toLowerCase() === name.toLowerCase(),
		);
		if (idx >= 0) trackNumber = idx + 1;
	}

	const title = name
		? artist
			? `${name} - ${artist}`
			: name
		: pageTitle;

	if (!name && !pageTitle) {
		throw new Error("No Spotify track content found");
	}

	return {
		type: "music",
		title,
		url,
		platform: "spotify",
		name: name || null,
		artist: artist || null,
		album: album || null,
		releaseDate: releaseDate || null,
		duration: duration || null,
		trackNumber,
		...(genre.length > 0 ? { genre } : {}),
		previewUrl: null,
		albumArt,
		playCount: playCount || null,
		monthlyListeners: null,
		bio: null,
		trackList,
	};
}

// ── Artist page ──────────────────────────────────────────────────────────────

function parseArtistPage(doc: Document, url: string, pageTitle: string | null): MusicData {
	const container = selectOne('[data-testid="artist-page"]', doc) as Element | null;
	const genre = extractGenres(doc, container);

	// Artist name
	const entityTitle = selectOne('[data-testid="entityTitle"]', container ?? doc) as Element | null;
	const name = entityTitle ? textContent(entityTitle).trim() : null;

	// Monthly listeners
	let monthlyListeners: string | null = null;
	if (container) {
		const spans = selectAll("span", container) as unknown as Element[];
		for (const span of spans) {
			const text = textContent(span).trim();
			const match = text.match(/^([\d,]+)\s+monthly\s+listeners?$/i);
			if (match?.[1]) {
				monthlyListeners = match[1];
				break;
			}
		}
	}

	// Bio text from the About grid-container
	let bio: string | null = null;
	const grids = selectAll('[data-testid="grid-container"]', container ?? doc) as unknown as Element[];
	for (const grid of grids) {
		const text = textContent(grid).trim();
		if (text.includes("monthly listeners")) {
			// Extract bio from spans, divs, or paragraphs
			const candidates = selectAll("span, div, p", grid) as unknown as Element[];
			for (const el of candidates) {
				const elText = textContent(el).trim();
				// Bio is a long text block that doesn't start with "About" or contain only "monthly listeners"
				if (elText.length > 100 && !elText.startsWith("About")) {
					// Strip "X monthly listeners" prefix if present
					const bioText = elText.replace(/^[\d,]+\s+monthly\s+listeners\s*/i, "").trim();
					if (bioText.length > 50) {
						bio = bioText;
						break;
					}
				}
			}
			break;
		}
	}

	// Artist image from background-image style (may be outside the artist-page container)
	let albumArt: string | null = null;
	const bgEl = (selectOne('[data-testid="background-image"]', container ?? doc) ??
		selectOne('[data-testid="background-image"]', doc)) as Element | null;
	if (bgEl) {
		const style = getAttributeValue(bgEl, "style") || "";
		const urlMatch = style.match(/url\(["']?([^"')]+)["']?\)/);
		if (urlMatch?.[1]) albumArt = urlMatch[1];
	}

	// Top tracks from the first track-list
	let trackList: MusicTrackListEntry[] = [];
	const trackLists = selectAll('[data-testid="track-list"]', container ?? doc) as unknown as Element[];
	const firstTrackList = trackLists[0];
	if (firstTrackList) {
		trackList = extractTracklist(firstTrackList);
	}

	const title = name || pageTitle;

	if (!name && !pageTitle) {
		throw new Error("No Spotify artist content found");
	}

	return {
		type: "music",
		title,
		url,
		platform: "spotify",
		name: name || null,
		artist: name || null, // for artist pages, the artist IS the name
		album: null,
		releaseDate: null,
		duration: null,
		trackNumber: null,
		...(genre.length > 0 ? { genre } : {}),
		previewUrl: null,
		albumArt,
		playCount: null,
		monthlyListeners,
		bio,
		trackList,
	};
}

// ── Album page ───────────────────────────────────────────────────────────────

function parseAlbumPage(doc: Document, url: string, pageTitle: string | null): MusicData {
	const genre = extractGenres(doc);
	// Album pages use similar structure to track pages
	const entityTitle = selectOne('[data-testid="entityTitle"]', doc) as Element | null;
	const name = entityTitle ? textContent(entityTitle).trim() : null;

	// Artist from creator-link
	const creatorLink = selectOne('[data-testid="creator-link"]', doc) as Element | null;
	const artist = creatorLink ? textContent(creatorLink).trim() : null;

	// Release date
	const releaseDateEl = selectOne('[data-testid="release-date"]', doc) as Element | null;
	const releaseDate = releaseDateEl ? textContent(releaseDateEl).trim() : null;

	// Album art
	let albumArt: string | null = null;
	const img = selectOne('img[src*="i.scdn.co"]', doc) as Element | null;
	if (img) albumArt = getAttributeValue(img, "src") || null;

	// Track list
	let trackList: MusicTrackListEntry[] = [];
	const trackLists = selectAll('[data-testid="track-list"]', doc) as unknown as Element[];
	const albumTrackList = trackLists[0];
	if (albumTrackList) {
		trackList = extractTracklist(albumTrackList);
	}

	const title = name
		? artist
			? `${name} - ${artist}`
			: name
		: pageTitle;

	if (!name && !pageTitle) {
		throw new Error("No Spotify album content found");
	}

	return {
		type: "music",
		title,
		url,
		platform: "spotify",
		name: name || null,
		artist: artist || null,
		album: name || null, // album name IS the entity name
		releaseDate: releaseDate || null,
		duration: null,
		trackNumber: null,
		...(genre.length > 0 ? { genre } : {}),
		previewUrl: null,
		albumArt,
		playCount: null,
		monthlyListeners: null,
		bio: null,
		trackList,
	};
}

// ── Playlist page ────────────────────────────────────────────────────────────

function parsePlaylistPage(doc: Document, url: string, pageTitle: string | null): MusicData {
	const genre = extractGenres(doc);
	const entityTitle = selectOne('[data-testid="entityTitle"]', doc) as Element | null;
	const name = entityTitle ? textContent(entityTitle).trim() : null;

	// Playlist creator from creator-link (instead of artist)
	const creatorLink = selectOne('[data-testid="creator-link"]', doc) as Element | null;
	const creator = creatorLink ? textContent(creatorLink).trim() : null;

	// Playlist image
	let albumArt: string | null = null;
	const img = selectOne('img[src*="i.scdn.co"], img[src*="mosaic.scdn.co"]', doc) as Element | null;
	if (img) albumArt = getAttributeValue(img, "src") || null;

	// Track list
	let trackList: MusicTrackListEntry[] = [];
	const trackLists = selectAll('[data-testid="track-list"]', doc) as unknown as Element[];
	const playlistTrackList = trackLists[0];
	if (playlistTrackList) {
		trackList = extractTracklist(playlistTrackList);
	}

	const title = name || pageTitle;

	if (!name && !pageTitle) {
		throw new Error("No Spotify playlist content found");
	}

	return {
		type: "music",
		title,
		url,
		platform: "spotify",
		name: name || null,
		artist: creator || null,
		album: null,
		releaseDate: null,
		duration: null,
		trackNumber: null,
		...(genre.length > 0 ? { genre } : {}),
		previewUrl: null,
		albumArt,
		playCount: null,
		monthlyListeners: null,
		bio: null,
		trackList,
	};
}

// ── Fallback (generic Spotify page) ──────────────────────────────────────────

function parseFallback(doc: Document, url: string, pageTitle: string | null): MusicData {
	const genre = extractGenres(doc);
	const entityTitle = selectOne('[data-testid="entityTitle"]', doc) as Element | null;
	const name = entityTitle ? textContent(entityTitle).trim() : null;

	const ogTitle = getMeta(doc, "og:title");
	const title = name || ogTitle || pageTitle;

	if (!title) {
		throw new Error("No Spotify content found");
	}

	return {
		type: "music",
		title,
		url,
		platform: "spotify",
		name: name || null,
		artist: null,
		album: null,
		releaseDate: null,
		duration: null,
		trackNumber: null,
		...(genre.length > 0 ? { genre } : {}),
		previewUrl: null,
		albumArt: null,
		playCount: null,
		monthlyListeners: null,
		bio: null,
		trackList: [],
	};
}

// ── Public entry point ───────────────────────────────────────────────────────

export function parseSpotify(html: string, url: string): MusicData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const pageType = detectPageType(url);

	switch (pageType) {
		case "track":
			return parseTrackPage(doc, url, pageTitle);
		case "artist":
			return parseArtistPage(doc, url, pageTitle);
		case "album":
			return parseAlbumPage(doc, url, pageTitle);
		case "playlist":
			return parsePlaylistPage(doc, url, pageTitle);
		default:
			return parseFallback(doc, url, pageTitle);
	}
}
