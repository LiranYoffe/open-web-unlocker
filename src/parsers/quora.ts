import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, removeElement, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { QaAnswer, QaData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

/**
 * Parse a numeric vote count from a raw string like "1,055" or "10".
 * Returns null if not parseable.
 */
function parseVoteCount(raw: string): number | null {
	const cleaned = raw.replace(/,/g, "");
	const n = Number.parseInt(cleaned, 10);
	return Number.isNaN(n) ? null : n;
}

/**
 * Build a map from answer-item index → upvote count by scanning the raw HTML
 * for `aria-label="N upvotes"` patterns within each dom_annotate_question_answer_item region.
 *
 * The upvote count button lives deep in the DOM and htmlparser2's tree doesn't
 * always surface it under the container element, so regex on the raw HTML is
 * more reliable here.
 */
function extractVotesByRegion(html: string): Map<number, number> {
	const votes = new Map<number, number>();

	// Find the byte ranges for each answer item
	const itemPattern = /dom_annotate_question_answer_item_(\d+)/g;
	const regions: { index: number; start: number }[] = [];
	let m: RegExpExecArray | null;
	while ((m = itemPattern.exec(html)) !== null) {
		const captured = m[1];
		if (captured === undefined) continue;
		regions.push({ index: Number.parseInt(captured, 10), start: m.index });
	}

	// Deduplicate (the class string appears once per item)
	const seen = new Set<number>();
	const uniqueRegions: { index: number; start: number }[] = [];
	for (const r of regions) {
		if (!seen.has(r.index)) {
			seen.add(r.index);
			uniqueRegions.push(r);
		}
	}

	for (let i = 0; i < uniqueRegions.length; i++) {
		const region = uniqueRegions[i];
		if (!region) continue;
		const nextRegion = uniqueRegions[i + 1];
		const end = nextRegion ? nextRegion.start : html.length;
		const slice = html.slice(region.start, end);

		const voteMatch = slice.match(/aria-label="([\d,]+)\s+upvotes"/);
		if (voteMatch?.[1]) {
			const count = parseVoteCount(voteMatch[1]);
			if (count !== null) {
				votes.set(region.index, count);
			}
		}
	}

	return votes;
}

/**
 * Extract answers from Quora's browser-rendered DOM.
 *
 * Quora uses a custom component library with class-based selectors:
 *   - `dom_annotate_question_answer_item_N` — container per answer
 *   - `spacing_log_answer_content` — the answer text area
 *   - `spacing_log_answer_header` — author info and metadata
 */
function extractAnswersFromDOM(doc: Document, html: string): QaAnswer[] {
	const answers: QaAnswer[] = [];

	// Primary: class-based containers used by Quora's rendering
	const containers = selectAll(
		'[class*="dom_annotate_question_answer_item"]',
		doc,
	) as unknown as Element[];

	if (containers.length > 0) {
		const voteMap = extractVotesByRegion(html);

		for (let i = 0; i < Math.min(containers.length, 10); i++) {
			const container = containers[i];

			// Extract answer body from the content zone
			const contentEl = selectOne(".spacing_log_answer_content", container) as Element | null;
			if (!contentEl) continue;

			// Clean up UI artifacts before extracting text
			const readMoreBtns = selectAll(
				".puppeteer_test_read_more_button",
				contentEl,
			) as unknown as Element[];
			const gradientOverlays = selectAll(
				'[style*="linear-gradient"]',
				contentEl,
			) as unknown as Element[];
			for (const el of [...readMoreBtns, ...gradientOverlays]) {
				removeElement(el);
			}

			const body = textContent(contentEl).trim();
			if (body.length < 50) continue;

			const votes = voteMap.get(i) ?? null;
			answers.push({ body, votes, isAccepted: false });
		}
	}

	// Fallback: older data-testid selectors (React testing attributes)
	if (answers.length === 0) {
		const testIdSelectors = [
			'[data-testid="answers-list"] [data-testid="answer"]',
			'[data-testid="answer-content"]',
			'[data-testid="answer"]',
		];
		for (const sel of testIdSelectors) {
			try {
				const els = selectAll(sel, doc) as unknown as Element[];
				if (els.length === 0) continue;
				for (const el of els.slice(0, 10)) {
					const text = textContent(el).trim();
					if (text.length > 50) {
						answers.push({ body: text, votes: null, isAccepted: false });
					}
				}
				if (answers.length > 0) break;
			} catch {
				// Skip invalid selector
			}
		}
	}

	return answers;
}

export function parseQuora(html: string, url: string): QaData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// Question title from h1 or og:title
	const h1 = selectOne("h1", doc) as Element | null;
	const h1Text = h1 ? textContent(h1).trim() : null;
	const ogTitle = getMeta(doc, "og:title");
	const questionTitle = h1Text || ogTitle;

	// og:description often contains the best answer snippet (available without JS)
	const ogDesc = getMeta(doc, "og:description");
	const questionText = ogDesc && ogDesc.length > 50 ? ogDesc : null;

	const answers = extractAnswersFromDOM(doc, html);

	if (!questionTitle && !questionText && answers.length === 0) {
		throw new Error("No Quora content found");
	}

	return {
		type: "qa",
		title: questionTitle || pageTitle,
		url,
		platform: "quora",
		question: {
			text: questionText,
			votes: null,
		},
		answers,
	};
}
