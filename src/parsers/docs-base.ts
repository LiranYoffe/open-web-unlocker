/**
 * docs-base.ts — Base utilities and framework for documentation parsers.
 *
 * Provides shared extraction logic (title, markdown conversion, normalization)
 * and a framework for subclasses to override content/noise/breadcrumb/version selectors.
 */

import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import { Element, Text, type Document } from "domhandler";
import { getAttributeValue, replaceElement, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { DocumentationData, SearchResultsData } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "svg"],
});

// ── Shared helpers ───────────────────────────────────────────────────────────

export function getInnerHTML(element: Element): string {
	return render(element.children);
}

export function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

export function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

export function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

export function removeElements(parent: Element, selectors: string[]): void {
	for (const selector of selectors) {
		try {
			for (const el of selectAll(selector, parent) as unknown as Element[]) {
				if (el.parent) {
					const idx = el.parent.children.indexOf(el);
					if (idx !== -1) el.parent.children.splice(idx, 1);
				}
			}
		} catch {
			// Skip unsupported selector
		}
	}
}

function getParentElement(node: Element): Element | null {
	return node.parent?.type === "tag" ? (node.parent as Element) : null;
}

function getClassNames(element: Element | null): string[] {
	return (element ? getAttributeValue(element, "class") : null)?.split(/\s+/).filter(Boolean) ?? [];
}

function isInsideClass(element: Element, className: string): boolean {
	let current: Element | null = element;
	while (current) {
		if (getClassNames(current).includes(className)) return true;
		current = getParentElement(current);
	}
	return false;
}

function extractHighlightedLanguage(element: Element): string | null {
	let current: Element | null = element;
	while (current) {
		for (const className of getClassNames(current)) {
			if (className.startsWith("language-")) {
				return className.slice("language-".length).trim() || null;
			}
			if (className.startsWith("highlight-")) {
				const language = className.slice("highlight-".length).trim().toLowerCase();
				if (!language || language === "default" || language === "text") return null;
				return language;
			}
		}
		current = getParentElement(current);
	}
	return null;
}

function cleanTerminalMarkup(text: string): string {
	return text
		.replace(/<\/?(?:font|span|u|b)\b[^>]*>/gi, "")
		.replace(/&apos;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

function normalizeHighlightedPreBlocks(root: Element): void {
	const preBlocks = selectAll("pre", root) as unknown as Element[];
	for (const pre of preBlocks) {
		const classes = getClassNames(pre);
		const highlighted =
			classes.includes("highlight") ||
			classes.some((className) => className.startsWith("highlight-")) ||
			isInsideClass(pre, "highlight") ||
			isInsideClass(pre, "termy");
		if (!highlighted) continue;

		let codeText = textContent(pre).replace(/\r\n?/g, "\n").replace(/^\n+/, "").replace(/\s+$/, "");
		if (!codeText.trim()) continue;
		if (isInsideClass(pre, "termy")) {
			codeText = cleanTerminalMarkup(codeText);
		}

		const language = extractHighlightedLanguage(pre);
		const code = new Element("code", language ? { class: `language-${language}` } : {});
		const text = new Text(codeText);
		text.parent = code;
		code.children = [text];

		const replacement = new Element("pre", {});
		code.parent = replacement;
		replacement.children = [code];
		replaceElement(pre, replacement);
	}
}

export function cleanTitle(rawTitle: string | null): string | null {
	if (!rawTitle) return null;
	return rawTitle.replace(/\s+[–|—|·|-]\s+.{3,50}$/, "").trim() || rawTitle;
}

export function extractMarkdownTitle(markdown: string): string | null {
	const match = markdown.match(/^#\s+(.+)$/m);
	return match?.[1]?.replace(/\[(?:_link_|¶|​)\]\([^)]+\)/g, "").trim() || null;
}

export function normalizeDocsMarkdown(markdown: string): string {
	let body = markdown.replace(/\n{3,}/g, "\n\n").trim();

	body = body.replace(/^\[Skip to main content[^\n]*\n+/i, "");
	body = body.replace(/^Show nav\s*\n+/i, "");
	body = body.replace(/^\s*Skip to content\s*\n+/i, "");
	body = body.replace(
		/^#\s*\n+([^\n]+)\n+/,
		(_match, heading: string) => `# ${heading.trim()}\n\n`,
	);
	body = body.replace(
		/^(#{1,6})\s+\[([^\]]+)\]\([^)]*\)\s*$/gm,
		(_match, hashes: string, heading: string) => `${hashes} ${heading.trim()}`,
	);

	const firstHeadingIndex = body.search(/^#{1,6}\s+\S/m);
	if (firstHeadingIndex > 0) {
		body = body.slice(firstHeadingIndex);
	}

	body = body.replace(/\n+Stay organized with collections Save and categorize content based on your preferences\.\s*/gi, "\n");
	body = body.replace(/\n+Send feedback\b[\s\S]*$/i, "");
	body = body.replace(/\n+Was this page useful\?[\s\S]*$/i, "");
	body = body.replace(/\n+Except as otherwise noted,[\s\S]*$/i, "");
	body = body.replace(/\n+Need to tell us more\?[\s\S]*$/i, "");
	body = body.replace(/\n+# Thank you for your support[\s\S]*$/i, "");
	body = body.replace(/\n+#+ Help improve MDN[\s\S]*$/i, "");
	body = body.replace(/\n+Was this page helpful to you\?[\s\S]*$/i, "");
	body = body.replace(/\n+This page was last modified on[\s\S]*$/i, "");
	body = body.replace(/\[(?:_link_|¶|​)\]\([^)]+\)/g, "");
	body = body.replace(/^\s*(?:content_copy|open_in_new|Copy)\s*$/gm, "");
	body = body.replace(/^\s*arrow_upward_alt\s+Back to the top\s*$/gm, "");
	body = body.replace(/^\[\s*Edit this page\s*\]\([^)]+\)\s*$/gm, "");
	body = body.replace(/\bCopy(?=\[)/g, "");
	body = body.replace(/\n(?:\d+\n){2,}(?=```)/g, "\n");
	// Collapse multi-space runs outside fenced code blocks
	const codeBlockRe = /^```[\s\S]*?^```/gm;
	const codeBlocks: string[] = [];
	body = body.replace(codeBlockRe, (match) => {
		codeBlocks.push(match);
		return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
	});
	body = body.replace(/[ \t]{2,}/g, " ");
	body = body.replace(/__CODE_BLOCK_(\d+)__/g, (_m, i) => codeBlocks[Number(i)]);

	return body.replace(/\n{3,}/g, "\n\n").trim();
}

export function toMarkdown(html: string): string {
	return nhm.translate(html);
}

// ── Docs search results extraction (shared) ─────────────────────────────────

export function extractDocsSearchResults(doc: Document, url: string, title: string | null): SearchResultsData | null {
	const parsedUrl = new URL(url);
	const query =
		parsedUrl.searchParams.get("q") ??
		parsedUrl.searchParams.get("query") ??
		parsedUrl.searchParams.get("search");

	const djangoTitles = selectAll("dl.search-links dt", doc) as unknown as Element[];
	if (djangoTitles.length > 0) {
		const snippets = selectAll("dl.search-links dd", doc) as unknown as Element[];
		const results = djangoTitles.map((dt, index) => {
			const link = selectOne("a", dt) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			const snippet = snippets[index] ? textContent(snippets[index]).replace(/\s+/g, " ").trim() || null : null;
			if (!link || !href) return null;
			const breadcrumbs = (selectAll(".breadcrumbs a", dt) as unknown as Element[])
				.map((a) => textContent(a).trim())
				.filter(Boolean);
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: href,
				snippet,
				category: breadcrumbs.join(" › ") || null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return { type: "search-results", title, url, engine: "documentation", query, results };
	}

	const sphinxItems = selectAll("#search-results ul.search > li, #search-results li.kind-text", doc) as unknown as Element[];
	if (sphinxItems.length > 0) {
		const results = sphinxItems.map((item, index) => {
			const link = selectOne("a", item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const context = getText("p.context", item);
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: new URL(href, url).toString(),
				snippet: context,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		if (results.length > 0) {
			return { type: "search-results", title, url, engine: "documentation", query, results };
		}
	}

	const pagefindResults = selectAll(".pagefind-ui__result", doc) as unknown as Element[];
	if (pagefindResults.length > 0) {
		const results = pagefindResults.map((item, index) => {
			const primaryLink = selectOne(".pagefind-ui__result-link", item) as Element | null;
			const href = primaryLink ? getAttributeValue(primaryLink, "href") : null;
			if (!primaryLink || !href) return null;

			const nestedTitles = (selectAll(".pagefind-ui__result-nested .pagefind-ui__result-title", item) as unknown as Element[])
				.map((el) => textContent(el).replace(/\s+/g, " ").trim())
				.filter(Boolean);
			const nestedExcerpts = (selectAll(".pagefind-ui__result-excerpt", item) as unknown as Element[])
				.map((el) => textContent(el).replace(/\s+/g, " ").trim())
				.filter(Boolean);
			const category = getText(".pagefind-ui__result-tag", item)?.replace(/^Category:\s*/i, "") ?? null;
			const snippetParts = [...nestedTitles, ...nestedExcerpts].slice(0, 6);

			return {
				position: index + 1,
				title: textContent(primaryLink).replace(/\s+/g, " ").trim(),
				url: new URL(href, url).toString(),
				snippet: snippetParts.join(" | ") || null,
				category,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return { type: "search-results", title, url, engine: "documentation", query, results };
	}

	const mdnResults = selectAll("mdn-site-search owu-shadow-root .site-search-results__item", doc) as unknown as Element[];
	if (mdnResults.length > 0) {
		const results = mdnResults.map((item, index) => {
			const link = selectOne(".site-search-results__title a", item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: new URL(href, url).toString(),
				snippet: getText(".site-search-results__description", item),
				category: getText(".site-search-results__path", item),
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return { type: "search-results", title, url, engine: "documentation", query, results };
	}

	return null;
}

// ── Base docs parser interface ───────────────────────────────────────────────

export interface DocsParserConfig {
	/** CSS selectors for main content container, tried in order */
	contentSelectors: string[];
	/** CSS selectors for noise elements to strip from content */
	noiseSelectors: string[];
	/** Extract breadcrumb from the document */
	extractBreadcrumb(doc: Document): string | null;
	/** Extract version from the document */
	extractVersion(doc: Document): string | null;
}

/** Shared noise selectors common to all documentation sites */
export const BASE_NOISE_SELECTORS = [
	"nav",
	"[role='navigation']",
	"header",
	"footer",
	".nocontent",
	".sidebar",
	".side-nav",
	".toc",
	".table-of-contents",
	"#table-of-contents",
	".on-this-page",
	"#on-this-page",
	".edit-page",
	".edit-link",
	"[aria-label='Edit this page']",
	".prev-next",
	".pagination",
	".page-nav",
	".doc-action",
	".content-edit",
	".feedback-widget",
	"[data-pagefind-ignore]",
];

/** Run the docs parsing pipeline with a given config */
export function parseDocsWithConfig(
	config: DocsParserConfig,
	html: string,
	url: string,
): DocumentationData | SearchResultsData {
	const doc = parseDocument(html);
	const title = cleanTitle(extractTitle(doc));

	const breadcrumb = config.extractBreadcrumb(doc);
	const version = config.extractVersion(doc);
	const searchResults = extractDocsSearchResults(doc, url, title);
	if (searchResults) return searchResults;

	let content: Element | null = null;
	for (const selector of config.contentSelectors) {
		try {
			content = selectOne(selector, doc) as Element | null;
			if (content && textContent(content).trim().length > 300) break;
			content = null;
		} catch {
			// Skip unsupported selector
		}
	}

	if (!content) {
		const ogDesc = getAttr('meta[property="og:description"]', "content", doc);
		const ogTitle = getAttr('meta[property="og:title"]', "content", doc);
		if (ogDesc || ogTitle) {
			return {
				type: "documentation",
				title: ogTitle ?? title,
				url,
				breadcrumb,
				version,
				content: ogDesc ?? "",
			};
		}
		throw new Error("No documentation content found");
	}

	removeElements(content, config.noiseSelectors);
	normalizeHighlightedPreBlocks(content);

	const md = toMarkdown(getInnerHTML(content));
	const body = normalizeDocsMarkdown(md);

	if (body.length < 50) {
		throw new Error("Documentation content too short");
	}

	const markdownTitle = body.startsWith("# ") ? extractMarkdownTitle(body) : null;

	return {
		type: "documentation",
		title: markdownTitle ?? title,
		url,
		breadcrumb,
		version,
		content: body,
	};
}
