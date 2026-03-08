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

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

export function parsePubMed(html: string, url: string): PaperData {
	const doc = parseDocument(html);
	const pageTitle = extractPageTitle(doc);

	// PMID from URL path: /34677179/
	const pmid = new URL(url).pathname.replace(/\//g, "").trim() || null;

	// ── Title ─────────────────────────────────────────────────────────────
	const paperTitle = getText("h1.heading-title", doc);

	// ── Authors ───────────────────────────────────────────────────────────
	// Each author is in a span with class "authors-list-item"; name is in a.full-name
	const authorItemEls = selectAll("div.authors-list span.authors-list-item", doc) as unknown as Element[];
	let authors: string[] = [];

	if (authorItemEls.length > 0) {
		for (const item of authorItemEls) {
			const nameEl = selectOne("a.full-name", item) as Element | null;
			if (nameEl) {
				const name = textContent(nameEl).trim();
				if (name) authors.push(name);
			}
		}
	}

	// Fallback: span.authors-list-item__name
	if (authors.length === 0) {
		const nameEls = selectAll("span.authors-list-item__name", doc) as unknown as Element[];
		authors = nameEls.map((el) => textContent(el).trim()).filter(Boolean);
	}

	// PubMed duplicates content in full-view and short-view sections — deduplicate
	authors = [...new Set(authors)];

	// ── Abstract ──────────────────────────────────────────────────────────
	const abstractParas = selectAll("div.abstract-content p", doc) as unknown as Element[];
	let abstract: string | null = null;
	if (abstractParas.length > 0) {
		const parts = abstractParas
			.map((p) => textContent(p).trim())
			.filter(Boolean);
		if (parts.length > 0) {
			abstract = parts.join("\n\n").replace(/^Abstract:\s*/i, "").trim() || null;
		}
	}
	// Fallback: entire abstract-content div
	if (!abstract) {
		const raw = getText("div.abstract-content", doc);
		abstract = raw ? raw.replace(/^Abstract:\s*/i, "").trim() || null : null;
	}

	// ── Publication date ──────────────────────────────────────────────────
	// span.cit contains e.g. "2021 Nov 9;333(6049):1453-1458."
	const citText = getText("span.cit", doc);
	let dateSubmitted: string | null = null;
	if (citText) {
		// Extract leading date portion (year + optional month + day)
		const match = citText.match(/^(\d{4}(?:\s+\w+(?:\s+\d+)?)?)/);
		const firstSegment = citText.split(";")[0];
		dateSubmitted = match ? match[1]?.trim() ?? null : firstSegment?.trim() ?? null;
	}

	// ── Journal / venue ───────────────────────────────────────────────────
	// Try button#full-view-journal-trigger, then a.journal-name
	let journalName =
		getText("button#full-view-journal-trigger", doc) ??
		getText("a.journal-name", doc) ??
		null;

	// Build journalRef from citation text (journal + volume + pages)
	let journalRef: string | null = null;
	if (journalName && citText) {
		// citText example: "2021 Nov 9;333(6049):1453-1458."
		// journalRef = "journal vol(issue):pages"
		const volPagesMatch = citText.match(/;([^.]+)/);
		if (volPagesMatch?.[1]) {
			journalRef = `${journalName} ${volPagesMatch[1].trim()}`;
		} else {
			journalRef = journalName;
		}
	} else if (journalName) {
		journalRef = journalName;
	}

	// ── Subjects / MeSH terms ─────────────────────────────────────────────
	// div.mesh-terms a
	const meshEls = selectAll("div.mesh-terms a", doc) as unknown as Element[];
	let subjects: string | null = null;
	if (meshEls.length > 0) {
		const terms = meshEls.map((el) => textContent(el).trim()).filter(Boolean);
		subjects = terms.join(", ") || null;
	}
	// Fallback: author keywords — use button.keyword-link to avoid action-link noise
	if (!subjects) {
		const kwEls = selectAll("ul.keywords-list button.keyword-link", doc) as unknown as Element[];
		if (kwEls.length > 0) {
			const kws = kwEls.map((el) => textContent(el).trim()).filter(Boolean);
			subjects = kws.join(", ") || null;
		}
	}

	// ── PDF / full-text URL ───────────────────────────────────────────────
	// a[data-ga-action="FreeFullText"] href
	let pdfUrl: string | null =
		getAttr('a[data-ga-action="FreeFullText"]', "href", doc) ??
		null;

	// Fallback: PMC link (a[ref="linksrc=article_header_links"])
	if (!pdfUrl) {
		const pmcLinkEl = selectOne('a[ref="linksrc=article_header_links"]', doc) as Element | null;
		if (pmcLinkEl) {
			pdfUrl = getAttributeValue(pmcLinkEl, "href") ?? null;
		}
	}

	// Ensure absolute URL
	if (pdfUrl && pdfUrl.startsWith("/")) {
		pdfUrl = `https://pubmed.ncbi.nlm.nih.gov${pdfUrl}`;
	}

	// ── DOI ───────────────────────────────────────────────────────────────
	// Not in PaperData but useful for journalRef enrichment if needed
	// const doiHref = getAttr('a[data-ga-action="DOI"]', "href", doc);

	// ── comments field (PubMed has no arXiv-style comments, use PMID note) ─
	const comments = pmid ? `PMID: ${pmid}` : null;

	if (!paperTitle && !abstract) {
		throw new Error("No PubMed content found");
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
