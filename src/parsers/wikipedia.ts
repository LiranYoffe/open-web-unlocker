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
		const elements = selectAll(selector, parent) as unknown as Element[];
		for (const el of elements) {
			if (el.parent) {
				const idx = el.parent.children.indexOf(el);
				if (idx !== -1) {
					el.parent.children.splice(idx, 1);
				}
			}
		}
	}
}

export function parseWikipedia(html: string, url: string): WikiData {
	const doc = parseDocument(html);
	const title = extractTitle(doc);

	// #mw-content-text is the main article container — avoids the small .mw-parser-output
	// inside .mw-indicators (protection badges etc.) that appears earlier in the DOM
	const content =
		(selectOne("#mw-content-text .mw-parser-output", doc) as Element | null) ??
		(selectOne(".mw-content-ltr.mw-parser-output", doc) as Element | null) ??
		(selectOne(".mw-parser-output", doc) as Element | null);
	if (!content) {
		throw new Error("No Wikipedia content found");
	}

	// Remove noise elements
	removeElements(content, [
		".navbox",
		".infobox",
		".sidebar",
		".mw-editsection",
		".reference",
		".reflist",
		".toc",
		".mw-empty-elt",
		".noprint",
		".metadata",
		".hatnote",
		".shortdescription",
	]);

	const contentHtml = getInnerHTML(content);
	const md = nhm.translate(contentHtml).replace(/\n{3,}/g, "\n\n").trim();

	// If content is suspiciously small (fetch issue / redirect / parse problem), fall back
	if (md.length < 500) {
		throw new Error("Wikipedia content too short — falling back to generic");
	}

	return { type: "wiki", title, url, content: md };
}
