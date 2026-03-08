import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { QaAnswer, QaData } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "svg"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

export function parseStackOverflow(html: string, url: string): QaData {
	const doc = parseDocument(html);
	const title = extractTitle(doc);

	// ── Question title ─────────────────────────────────────────────────────
	// SO uses itemprop="name" on the h1 inside #question-header
	const questionTitle =
		getText('#question-header [itemprop="name"]', doc) ??
		getText("#question-header h1", doc);

	// ── Question body ─────────────────────────────────────────────────────
	// SO uses itemprop="text" on the question post body
	let questionText: string | null = null;
	let questionVotes: number | null = null;

	const questionPost = selectOne('[itemtype="https://schema.org/Question"]', doc) as Element | null;
	if (questionPost) {
		const questionBody = selectOne('[itemprop="text"]', questionPost) as Element | null;
		if (questionBody) {
			const md = nhm.translate(getInnerHTML(questionBody));
			questionText = md.replace(/\n{3,}/g, "\n\n").trim() || null;
		}
		const votesAttr = getAttr('[itemprop="upvoteCount"]', "content", questionPost);
		if (votesAttr !== null) {
			const n = Number(votesAttr);
			if (!Number.isNaN(n)) questionVotes = n;
		}
	}

	// ── Answers ────────────────────────────────────────────────────────────
	// SO uses itemprop="suggestedAnswer" or "acceptedAnswer" on answer elements
	const answers: QaAnswer[] = [];

	const acceptedAnswers = selectAll('[itemprop="acceptedAnswer"]', doc) as unknown as Element[];
	for (const answer of acceptedAnswers) {
		const body = selectOne('[itemprop="text"]', answer) as Element | null;
		if (body) {
			const md = nhm.translate(getInnerHTML(body));
			const votesAttr = getAttr('[itemprop="upvoteCount"]', "content", answer);
			const votes = votesAttr !== null ? Number(votesAttr) : null;
			answers.push({
				body: md.replace(/\n{3,}/g, "\n\n").trim(),
				votes: votes !== null && !Number.isNaN(votes) ? votes : null,
				isAccepted: true,
			});
		}
	}

	const suggestedAnswers = selectAll('[itemprop="suggestedAnswer"]', doc) as unknown as Element[];
	for (const answer of suggestedAnswers) {
		const body = selectOne('[itemprop="text"]', answer) as Element | null;
		if (body) {
			const md = nhm.translate(getInnerHTML(body));
			const votesAttr = getAttr('[itemprop="upvoteCount"]', "content", answer);
			const votes = votesAttr !== null ? Number(votesAttr) : null;
			answers.push({
				body: md.replace(/\n{3,}/g, "\n\n").trim(),
				votes: votes !== null && !Number.isNaN(votes) ? votes : null,
				isAccepted: false,
			});
		}
	}

	// ── Fallback: .s-prose (CSS utility class, less stable but widely used) ──
	// Only used when itemprop selectors found nothing
	if (!questionText && answers.length === 0) {
		const anyBody = selectOne(".s-prose", doc) as Element | null;
		if (anyBody) {
			const md = nhm.translate(getInnerHTML(anyBody));
			questionText = md.replace(/\n{3,}/g, "\n\n").trim() || null;
		}
	}

	if (!questionTitle && !questionText && answers.length === 0) {
		throw new Error("No StackOverflow-specific content found");
	}

	return {
		type: "qa",
		title: questionTitle || title,
		url,
		platform: "stackoverflow",
		question: {
			text: questionText,
			votes: questionVotes,
		},
		answers,
	};
}
