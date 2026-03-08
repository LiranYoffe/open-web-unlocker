import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { BookData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
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

/** Extract the __NEXT_DATA__ apolloState from Goodreads' Next.js payload. */
function extractApolloState(doc: Document): Record<string, unknown> | null {
	const scriptEl = selectOne('script[id="__NEXT_DATA__"]', doc) as Element | null;
	if (!scriptEl) return null;
	const raw = textContent(scriptEl).trim();
	if (!raw) return null;
	try {
		const data = JSON.parse(raw) as Record<string, unknown>;
		const props = data.props as Record<string, unknown> | undefined;
		const pageProps = props?.pageProps as Record<string, unknown> | undefined;
		return (pageProps?.apolloState as Record<string, unknown>) ?? null;
	} catch {
		return null;
	}
}

function parsePersonName(person: unknown): string | null {
	if (!person || typeof person !== "object") return null;
	const p = person as Record<string, unknown>;
	return typeof p.name === "string" ? p.name : null;
}

function parseAuthorList(list: unknown): string | null {
	if (Array.isArray(list)) {
		const names = list.map(parsePersonName).filter(Boolean);
		return names.length > 0 ? names.join(", ") : null;
	}
	return parsePersonName(list);
}

export function parseGoodreads(html: string, url: string): BookData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const apolloState = extractApolloState(doc);

	// ── 1. JSON-LD (Book schema) ────────────────────────────────────────────
	const jsonLdItems = extractJsonLd(doc);
	let ldName: string | null = null;
	let ldAuthor: string | null = null;
	let ldRating: string | null = null;
	let ldRatingCount: string | null = null;
	let ldReviewCount: string | null = null;
	let ldPageCount: string | null = null;
	let ldCoverUrl: string | null = null;

	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] !== "Book") continue;

		ldName = typeof obj.name === "string" ? obj.name : null;
		ldAuthor = parseAuthorList(obj.author);
		ldCoverUrl = typeof obj.image === "string" ? obj.image : null;

		if (typeof obj.numberOfPages === "number") {
			ldPageCount = String(obj.numberOfPages);
		}

		const ratingObj = obj.aggregateRating as Record<string, unknown> | undefined;
		if (ratingObj) {
			if (ratingObj.ratingValue != null) ldRating = String(ratingObj.ratingValue);
			if (ratingObj.ratingCount != null) ldRatingCount = String(ratingObj.ratingCount);
			if (ratingObj.reviewCount != null) ldReviewCount = String(ratingObj.reviewCount);
		}

		break; // Only one Book expected
	}

	// ── 2. __NEXT_DATA__ apolloState (publisher, isbn, series) ──────────────
	let apolloPublisher: string | null = null;
	let apolloIsbn: string | null = null;
	let apolloSeries: string | null = null;

	if (apolloState) {
		// Find the Book entry
		for (const [key, value] of Object.entries(apolloState)) {
			if (!key.startsWith("Book:")) continue;
			const book = value as Record<string, unknown>;

			// details contains publisher, isbn, isbn13
			const details = book.details as Record<string, unknown> | undefined;
			if (details) {
				if (typeof details.publisher === "string" && details.publisher) {
					apolloPublisher = details.publisher;
				}
				if (typeof details.isbn13 === "string" && details.isbn13) {
					apolloIsbn = details.isbn13;
				} else if (typeof details.isbn === "string" && details.isbn) {
					apolloIsbn = details.isbn;
				}
			}

			// bookSeries contains series info with refs to Series: entries
			const bookSeries = book.bookSeries as unknown[];
			if (Array.isArray(bookSeries) && bookSeries.length > 0) {
				const first = bookSeries[0] as Record<string, unknown>;
				const position = typeof first.userPosition === "string" ? first.userPosition : null;
				const seriesRef = first.series as Record<string, unknown> | undefined;
				const seriesId = seriesRef?.__ref as string | undefined;
				if (seriesId && apolloState[seriesId]) {
					const seriesEntry = apolloState[seriesId] as Record<string, unknown>;
					const seriesTitle = typeof seriesEntry.title === "string" ? seriesEntry.title : null;
					if (seriesTitle) {
						apolloSeries = position ? `${seriesTitle} #${position}` : seriesTitle;
					}
				}
			}

			break; // Only one Book expected
		}
	}

	// ── 3. DOM fallbacks ────────────────────────────────────────────────────

	// Description: [data-testid="description"] contains a span with full text
	const descEl = selectOne('[data-testid="description"]', doc) as Element | null;
	let description: string | null = null;
	if (descEl) {
		// Goodreads has both a truncated and full span; take the longest
		const spans = selectAll("span", descEl) as unknown as Element[];
		let longest = "";
		for (const span of spans) {
			const text = textContent(span).trim();
			if (text.length > longest.length) longest = text;
		}
		if (longest) description = longest;
	}
	if (!description) {
		description = getMeta(doc, "og:description");
	}

	// Genres from DOM [data-testid="genresList"] links
	const genresList = selectOne('[data-testid="genresList"]', doc) as Element | null;
	const genres: string[] = [];
	if (genresList) {
		const links = selectAll("a", genresList) as unknown as Element[];
		for (const link of links) {
			const text = textContent(link).trim();
			if (text && text !== "...more") genres.push(text);
		}
	}

	// Publish date from [data-testid="publicationInfo"]
	const publicationInfo = getText('[data-testid="publicationInfo"]', doc);
	let publishDate: string | null = null;
	if (publicationInfo) {
		// Typical: "First published September 21, 1937"
		const dateMatch = publicationInfo.match(
			/(?:first\s+published|published)\s+(.+)/i,
		);
		publishDate = dateMatch?.[1]?.trim() ?? publicationInfo;
	}

	// Page count from [data-testid="pagesFormat"]
	let domPageCount: string | null = null;
	const pagesFormat = getText('[data-testid="pagesFormat"]', doc);
	if (pagesFormat) {
		const pageMatch = pagesFormat.match(/(\d[\d,]*)\s*pages/i);
		if (pageMatch?.[1]) domPageCount = pageMatch[1].replace(/,/g, "");
	}

	// Series from DOM (fallback if not found in apolloState)
	let domSeries: string | null = null;
	const seriesLink = selectOne('h3 a[href*="/series/"]', doc) as Element | null;
	if (seriesLink) {
		domSeries = textContent(seriesLink).trim() || null;
	}

	// Cover URL from DOM [data-testid="image"] or og:image
	const imageEl = selectOne('[data-testid="image"]', doc) as Element | null;
	const domCoverUrl = imageEl ? (getAttributeValue(imageEl, "src") ?? null) : null;

	// Author from DOM [data-testid="name"]
	const authorNameEl = selectOne('[data-testid="name"]', doc) as Element | null;
	const domAuthor = authorNameEl ? textContent(authorNameEl).trim() || null : null;

	// Book title from DOM [data-testid="bookTitle"]
	const domTitle = getText('[data-testid="bookTitle"]', doc);

	// ── 4. Merge: JSON-LD > apolloState > DOM > og:meta ─────────────────────
	const name = ldName || domTitle || getMeta(doc, "og:title");
	const author = ldAuthor || domAuthor;
	const coverUrl = ldCoverUrl || domCoverUrl || getMeta(doc, "og:image");

	if (!name && !description) {
		throw new Error("No Goodreads book content found");
	}

	return {
		type: "book",
		title: name || pageTitle,
		url,
		name,
		author,
		rating: ldRating,
		ratingCount: ldRatingCount,
		reviewCount: ldReviewCount,
		description,
		isbn: apolloIsbn,
		pageCount: ldPageCount || domPageCount,
		publishDate,
		publisher: apolloPublisher,
		genres,
		series: apolloSeries || domSeries,
		coverUrl,
	};
}
