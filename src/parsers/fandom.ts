import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { WikiData } from "./page-data";

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

function removeElements(parent: Element, selectors: string[]): void {
	for (const selector of selectors) {
		try {
			const elements = selectAll(selector, parent) as unknown as Element[];
			for (const el of elements) {
				if (el.parent) {
					const idx = el.parent.children.indexOf(el);
					if (idx !== -1) {
						el.parent.children.splice(idx, 1);
					}
				}
			}
		} catch {
			// Skip unsupported selectors
		}
	}
}

const NOISE_SELECTORS = [
	".infobox",
	".navbox",
	".toc",
	".portable-infobox",
	".fandom-sticky-header",
	".page-header--fandom-community",
	".global-navigation",
	"aside",
	".noprint",
	".metadata",
	".mw-editsection",
	".reference",
	".reflist",
	"[class*='advertisement']",
	"[class*='cookie']",
];

// Ordered preference for content containers (all are stable named classes or IDs)
const CONTENT_SELECTORS = [
	".page-content .mw-parser-output",
	".mw-parser-output",
	".WikiaArticle",
	".article-content",
	"#WikiaArticle",
	// [class*='article-content'] removed — too broad, can match CSS-in-JS random classes
];

export function parseFandom(html: string, url: string): WikiData {
	const doc = parseDocument(html);
	const title = extractTitle(doc);

	let content: Element | null = null;
	for (const selector of CONTENT_SELECTORS) {
		content = selectOne(selector, doc) as Element | null;
		if (content) break;
	}

	if (!content) {
		throw new Error("No Fandom content found");
	}

	removeElements(content, NOISE_SELECTORS);

	const md = nhm.translate(getInnerHTML(content));
	return { type: "wiki", title, url, content: md.replace(/\n{3,}/g, "\n\n").trim() };
}
