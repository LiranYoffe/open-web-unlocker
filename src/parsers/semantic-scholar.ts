/**
 * semantic-scholar.ts — Semantic Scholar paper page parser.
 *
 * Strategy:
 *   1. Extract from __NEXT_DATA__ script tag (Next.js SSR data) — primary source.
 *      Path: props.pageProps.pageData.{title, authors, tldr, abstract, ...}
 *   2. JSON-LD ScholarlyArticle — secondary structured data.
 *   3. DOM selectors — fallback for browser-rendered pages.
 *
 * Semantic Scholar is a Next.js app that requires browser rendering.
 * Config uses browser_dc as entry strategy.
 *
 * Selector priority: __NEXT_DATA__ → JSON-LD → [data-test-id] → semantic HTML
 * Never use: [class*=...] substring class selectors
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PaperData } from "./page-data";

function extractPageTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	if (!el) return null;
	const raw = textContent(el).trim();
	return raw || null;
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
			// ignore invalid JSON
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

function toAbsoluteUrl(href: string): string {
	if (href.startsWith("http://") || href.startsWith("https://")) return href;
	return `https://www.semanticscholar.org${href.startsWith("/") ? "" : "/"}${href}`;
}

// ── __NEXT_DATA__ extraction ─────────────────────────────────────────────────

interface S2NextPaper {
	title?: unknown;
	authors?: { name?: unknown; authorId?: unknown }[];
	tldr?: { text?: unknown };
	abstract?: unknown;
	year?: unknown;
	publicationDate?: unknown;
	venue?: { text?: unknown };
	journal?: { name?: unknown; volume?: unknown; pages?: unknown };
	fieldsOfStudy?: { category?: unknown }[];
	primaryPaperLink?: { url?: unknown; type?: unknown };
	alternatePaperLinks?: { url?: unknown; type?: unknown }[];
	citationCount?: unknown;
	referenceCount?: unknown;
}

function extractNextData(doc: Document): S2NextPaper | null {
	const nextDataEl = selectOne('script[id="__NEXT_DATA__"]', doc) as Element | null;
	if (!nextDataEl) return null;

	try {
		const json = JSON.parse(textContent(nextDataEl)) as Record<string, unknown>;
		const props = (json.props as Record<string, unknown> | undefined) ?? {};
		const pageProps = (props.pageProps as Record<string, unknown> | undefined) ?? {};

		// Semantic Scholar stores paper data at pageProps.pageData or pageProps.paper
		const pageData =
			(pageProps.pageData as Record<string, unknown> | undefined) ??
			(pageProps.paper as Record<string, unknown> | undefined) ??
			null;

		if (!pageData) return null;

		// Sometimes the paper data is nested under pageData.paper
		const paper =
			(pageData.paper as Record<string, unknown> | undefined) ?? pageData;

		return paper as unknown as S2NextPaper;
	} catch {
		return null;
	}
}

export function parseSemanticScholar(html: string, url: string): PaperData {
	const doc = parseDocument(html);
	const pageTitle = extractPageTitle(doc);

	// Detect author profile pages — fall through to generic
	const pathname = new URL(url).pathname;
	if (pathname.startsWith("/author/")) {
		throw new Error("Semantic Scholar author page — no paper content");
	}

	let paperTitle: string | null = null;
	let authors: string[] = [];
	let abstract: string | null = null;
	let dateSubmitted: string | null = null;
	let journalRef: string | null = null;
	let subjects: string | null = null;
	let pdfUrl: string | null = null;
	let comments: string | null = null;

	// ── __NEXT_DATA__ (primary source) ───────────────────────────────────────
	const nextPaper = extractNextData(doc);

	if (nextPaper) {
		paperTitle = stringVal(nextPaper.title) ?? null;

		if (Array.isArray(nextPaper.authors)) {
			for (const a of nextPaper.authors) {
				const name = stringVal(a.name);
				if (name) authors.push(name);
			}
		}

		// TL;DR as abstract fallback, prefer full abstract
		abstract = stringVal(nextPaper.abstract) ?? null;
		if (!abstract && nextPaper.tldr) {
			abstract = stringVal(nextPaper.tldr.text) ?? null;
		}

		// Date
		dateSubmitted =
			stringVal(nextPaper.publicationDate) ??
			(nextPaper.year != null ? String(nextPaper.year) : null);

		// Journal / venue
		if (nextPaper.journal) {
			journalRef = stringVal(nextPaper.journal.name) ?? null;
		}
		if (!journalRef && nextPaper.venue) {
			journalRef = stringVal(nextPaper.venue.text) ?? null;
		}

		// Fields of study
		if (Array.isArray(nextPaper.fieldsOfStudy) && nextPaper.fieldsOfStudy.length > 0) {
			const fieldNames = nextPaper.fieldsOfStudy
				.map((f) => stringVal(f.category))
				.filter((v): v is string => v !== null);
			if (fieldNames.length > 0) subjects = fieldNames.join(", ");
		}

		// PDF URL
		if (nextPaper.primaryPaperLink) {
			const linkUrl = stringVal(nextPaper.primaryPaperLink.url);
			if (linkUrl) pdfUrl = linkUrl;
		}
		if (!pdfUrl && Array.isArray(nextPaper.alternatePaperLinks)) {
			for (const link of nextPaper.alternatePaperLinks) {
				const linkUrl = stringVal(link.url);
				if (linkUrl) {
					pdfUrl = linkUrl;
					break;
				}
			}
		}

		// Citation / reference counts as comments
		const citationCount = nextPaper.citationCount;
		const referenceCount = nextPaper.referenceCount;
		const parts: string[] = [];
		if (citationCount != null && citationCount !== 0)
			parts.push(`${citationCount} citations`);
		if (referenceCount != null && referenceCount !== 0)
			parts.push(`${referenceCount} references`);
		if (parts.length > 0) comments = parts.join(", ");
	}

	// ── JSON-LD ScholarlyArticle (secondary) ─────────────────────────────────
	const jsonLdItems = extractJsonLd(doc);
	const article = findByType(jsonLdItems, "ScholarlyArticle");

	if (article) {
		// Title: name or headline
		if (!paperTitle) {
			paperTitle = stringVal(article.name) ?? stringVal(article.headline) ?? null;
		}

		// Authors: author array of {name: string} objects or plain strings
		if (authors.length === 0) {
			const authorField = article.author;
			if (Array.isArray(authorField)) {
				for (const a of authorField) {
					if (typeof a === "string" && a.trim()) {
						authors.push(a.trim());
					} else if (a && typeof a === "object") {
						const nameVal = (a as Record<string, unknown>).name;
						const name = stringVal(nameVal);
						if (name) authors.push(name);
					}
				}
			} else if (typeof authorField === "string" && authorField.trim()) {
				authors = [authorField.trim()];
			}
		}

		// Abstract: description
		if (!abstract) {
			abstract = stringVal(article.description) ?? null;
		}

		// Date: datePublished
		if (!dateSubmitted) {
			dateSubmitted = stringVal(article.datePublished) ?? null;
		}

		// Journal: publisher.name or isPartOf.name
		if (!journalRef) {
			const publisher = article.publisher as Record<string, unknown> | undefined;
			if (publisher) {
				journalRef = stringVal(publisher.name) ?? null;
			}
			if (!journalRef) {
				const isPartOf = article.isPartOf as Record<string, unknown> | undefined;
				if (isPartOf) {
					journalRef = stringVal(isPartOf.name) ?? null;
				}
			}
		}
	}

	// ── DOM fallbacks ─────────────────────────────────────────────────────────

	// Title
	if (!paperTitle) {
		paperTitle =
			getText('h1[data-test-id="paper-detail-title"]', doc) ??
			getText('h1[data-heap-redact-text="true"]', doc) ??
			getText("h1", doc) ??
			null;
	}

	// Authors: a[data-test-id="author-list-item-link"]
	if (authors.length === 0) {
		const authorEls = selectAll('a[data-test-id="author-list-item-link"]', doc) as unknown as Element[];
		authors = authorEls.map((el) => textContent(el).trim()).filter(Boolean);
	}
	// Broader fallback: author links within the author list section
	if (authors.length === 0) {
		const authorListEls = selectAll('[class*="author-list"] a, [class*="author"] [class*="name"], .author-list a', doc) as unknown as Element[];
		authors = authorListEls
			.map((el) => textContent(el).trim())
			.filter((t) => t.length > 1 && t.length < 100 && !t.includes("http"));
	}
	// Meta tag fallback for authors
	if (authors.length === 0) {
		const metaCitation = selectAll('meta[name="citation_author"]', doc) as unknown as Element[];
		authors = metaCitation
			.map((el) => getAttributeValue(el, "content") ?? "")
			.filter(Boolean);
	}

	// Abstract
	if (!abstract) {
		abstract = getText('div[data-test-id="abstract-text"]', doc) ?? null;
	}
	// Fallback: exact class "abstract" (no substring match)
	if (!abstract) {
		abstract = getText('[class="abstract"]', doc) ?? null;
	}
	// Broader fallback: any element with "abstract" in class that has substantial text
	if (!abstract) {
		const abstractCandidates = selectAll('[class*="abstract"], [id*="abstract"]', doc) as unknown as Element[];
		for (const el of abstractCandidates) {
			const text = textContent(el).trim();
			if (text.length > 50) {
				abstract = text;
				break;
			}
		}
	}
	// Meta tag fallback
	if (!abstract) {
		const metaDesc = selectOne('meta[name="description"]', doc) as Element | null;
		if (metaDesc) {
			const desc = getAttributeValue(metaDesc, "content") ?? "";
			if (desc.length > 80) {
				abstract = desc;
			}
		}
	}

	// Year / date
	if (!dateSubmitted) {
		dateSubmitted = getText('span[data-test-id="paper-year"]', doc) ?? null;
	}
	// Fallback: look for a 4-digit year near the citation area
	if (!dateSubmitted) {
		const citEl = selectOne('[data-test-id="paper-detail-header"]', doc) as Element | null;
		if (citEl) {
			const citText = textContent(citEl);
			const yearMatch = citText.match(/\b(19|20)\d{2}\b/);
			if (yearMatch) dateSubmitted = yearMatch[0];
		}
	}

	// Venue / journal
	if (!journalRef) {
		journalRef =
			getText('a[data-test-id="venue-name"]', doc) ??
			getText('span[data-test-id="venue-name"]', doc) ??
			null;
	}

	// Topics / fields of study
	if (!subjects) {
		const topicEls = selectAll('a[data-test-id="topic-label"]', doc) as unknown as Element[];
		if (topicEls.length > 0) {
			const topicNames = topicEls.map((el) => textContent(el).trim()).filter(Boolean);
			subjects = topicNames.join(", ") || null;
		}
	}

	// PDF URL: a[data-test-id="paper-link"] pointing to a PDF
	if (!pdfUrl) {
		const paperLinkEls = selectAll('a[data-test-id="paper-link"]', doc) as unknown as Element[];
		for (const el of paperLinkEls) {
			const href = getAttributeValue(el, "href") ?? "";
			if (href.toLowerCase().includes(".pdf") || href.toLowerCase().includes("pdf")) {
				pdfUrl = toAbsoluteUrl(href);
				break;
			}
		}
		// Broader fallback: any anchor whose href ends in .pdf within the page header
		if (!pdfUrl) {
			const headerEl = selectOne("header", doc) as Element | null;
			const searchRoot: Document | Element = headerEl ?? doc;
			const allLinks = selectAll("a", searchRoot) as unknown as Element[];
			for (const el of allLinks) {
				const href = getAttributeValue(el, "href") ?? "";
				if (href.endsWith(".pdf")) {
					pdfUrl = toAbsoluteUrl(href);
					break;
				}
			}
		}
	}

	// ── Validate ──────────────────────────────────────────────────────────────
	if (!paperTitle && authors.length === 0 && !abstract) {
		throw new Error("No Semantic Scholar content found");
	}

	return {
		type: "paper",
		title: paperTitle || pageTitle,
		url,
		paperTitle,
		authors,
		abstract,
		dateSubmitted,
		subjects,
		comments,
		journalRef,
		pdfUrl,
	};
}
