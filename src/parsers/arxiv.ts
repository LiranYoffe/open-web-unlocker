import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PaperData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	if (!el) return null;
	const raw = textContent(el).trim();
	return raw || null;
}

export function parseArxiv(html: string, url: string): PaperData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// ArXiv ID from URL path: /abs/1706.03762
	const arxivId = new URL(url).pathname.replace(/^\/abs\//, "").replace(/\/$/, "");

	// ── Title ─────────────────────────────────────────────────────────────
	// h1.title.mathjax contains "Title:Actual Title" — strip the prefix
	const titleEl = selectOne("h1.title", doc) as Element | null;
	let paperTitle: string | null = null;
	if (titleEl) {
		const raw = textContent(titleEl).trim();
		// Strip leading "Title:" label (rendered by a <span class="descriptor"> child)
		paperTitle = raw.replace(/^Title:\s*/i, "").trim() || null;
	}

	// ── Authors ───────────────────────────────────────────────────────────
	const authorEls = selectAll("div.authors a", doc) as unknown as Element[];
	const authors = authorEls.map((el) => textContent(el).trim()).filter(Boolean);

	// ── Submitted / updated date ──────────────────────────────────────────
	const dateline = getText("div.dateline", doc);
	const dateSubmitted = dateline ? dateline.replace(/\s+/g, " ").trim() : null;

	// ── Subjects ──────────────────────────────────────────────────────────
	const primarySubject = getText("td.tablecell.subjects span.primary-subject", doc);
	const subjectCell = getText("td.tablecell.subjects", doc);
	const subjects = (primarySubject ?? subjectCell ?? "").replace(/\s+/g, " ").trim() || null;

	// ── Comments (page count, etc.) ───────────────────────────────────────
	const comments = getText("td.tablecell.comments", doc);

	// ── Journal reference ─────────────────────────────────────────────────
	const journalRef = getText("td.tablecell.jref", doc);

	// ── Abstract ──────────────────────────────────────────────────────────
	const abstractEl = selectOne("blockquote.abstract", doc) as Element | null;
	let abstract: string | null = null;
	if (abstractEl) {
		const raw = textContent(abstractEl).trim();
		// Strip leading "Abstract:" label
		abstract = raw.replace(/^Abstract:\s*/i, "").trim() || null;
	}

	const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}` : null;

	if (!paperTitle && authors.length === 0 && !abstract) {
		throw new Error("No arXiv content found");
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
