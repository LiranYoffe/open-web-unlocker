/**
 * docs-site.ts — Parser for technical documentation websites
 *
 * Handles the major documentation platforms and their content structures:
 *   - Sphinx / ReadTheDocs  (docs.python.org, flask, fastapi, etc.)
 *   - MkDocs Material       (kubernetes.io, squidfunk.github.io, etc.)
 *   - Rustdoc               (doc.rust-lang.org)
 *   - Docusaurus            (react.dev, nextjs.org, prisma.io, etc.)
 *   - MDN Web Docs          (developer.mozilla.org)
 *   - GitHub Pages / Jekyll (expressjs.com, many libs)
 *   - MediaWiki             (cppreference.com, arch wiki, etc.)
 *   - Custom static sites   (nodejs.org, vuejs.org, tailwindcss.com, etc.)
 */

import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { DocumentationData, SearchResultsData } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "svg"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

function removeElements(parent: Element, selectors: string[]): void {
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

// Elements to strip from docs content (navigation chrome, not content)
const DOCS_NOISE = [
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
	".theme-doc-toc-mobile",
	".theme-doc-sidebar-container",
	".md-sidebar",
	".md-footer",
	".md-header",
	".md-search",
	".devsite-book-nav",
	"devsite-book-nav",
	".devsite-article-meta",
	".devsite-content-data",
	".devsite-content-footer",
	"devsite-content-footer",
	".toctree-wrapper",   // Sphinx TOC
	".admonition-title",  // Sphinx warning/note labels (keep body)
	".doc-action",
	".content-edit",
	".feedback-widget",
	"[data-pagefind-ignore]",
];

/**
 * Ordered list of CSS selectors for the main docs content container.
 * Earlier entries are more specific and take priority.
 */
const CONTENT_SELECTORS = [
	// Google Devsite (developer.chrome.com, firebase.google.com, etc.)
	"main#main-content article.devsite-article",
	"article.devsite-article",
	".devsite-article-body",
	// MDN Web Docs — uses BEM classes, content is in #content or .layout__content
	"#content.layout__content",
	".layout__content",
	// Docusaurus (react.dev, nextjs.org, prisma.io, trpc.io, etc.)
	"article.theme-doc-markdown",
	"article.markdown",
	// MkDocs Material (kubernetes.io, mkdocs.org, etc.)
	"article.md-content__inner",
	".md-content .md-typeset",
	".md-typeset",
	// Sphinx / ReadTheDocs
	"div[role='main'] .rst-content",
	".rst-content",
	"div[role='main'] .document",
	".document .section",
	// Rustdoc
	"section#main-content",
	".docblock",
	// Node.js docs
	"#content article",
	// GitHub Pages / Jekyll
	".markdown-body",
	// Library-specific / older static docs
	".doc-main",
	".doc-content",
	// Vue Press / VitePress
	".vp-doc",
	".content-container .content",
	// React Router / Tailwind-heavy docs layouts
	".markdown .md-prose",
	".md-prose",
	".markdown",
	// Symfony docs
	"main article.content",
	"article.content",
	// Tailwind / custom static
	".prose",
	// GitBook
	".page-inner section",
	".page-wrapper .page-inner",
	// W3Schools
	"#main",
	// Semantic HTML fallbacks
	"article",
	"main",
	"[role='main']",
	// Generic ID fallbacks
	"#content",
	"#main-content",
	"#docs-content",
	".content",
	".documentation",
	".docs-content",
	// Last-resort single-section layouts
	"section",
	"body",
];

/** Extract breadcrumb path for context e.g. "React > Learn > Quick Start" */
function extractBreadcrumb(doc: Document): string | null {
	const dedupeConsecutive = (items: string[]) =>
		items.filter((item, index) => item && item !== items[index - 1]);

	// Try aria-label="breadcrumb" first (semantic)
	const nav = selectOne('[aria-label="breadcrumb"]', doc) as Element | null;
	if (nav) {
		const items = dedupeConsecutive((selectAll("li, a, span", nav) as unknown as Element[])
			.map((el) => textContent(el).trim())
			.filter((t) => t && t !== "/" && t !== "›" && t !== ">" && t !== "»"));
		if (items.length > 1) return items.join(" › ");
	}
	// MkDocs breadcrumb
	const mkdocsCrumb = selectOne(".md-tabs__list", doc) as Element | null;
	if (mkdocsCrumb) {
		const items = dedupeConsecutive((selectAll("li", mkdocsCrumb) as unknown as Element[])
			.map((el) => textContent(el).trim())
			.filter(Boolean));
		if (items.length > 0) return items.join(" › ");
	}
	return null;
}

/** Extract page version/edition if shown in docs */
function extractVersion(doc: Document): string | null {
	const version = (
		getAttr('meta[name="docsearch:version"]', "content", doc) ??
		getText(".version", doc) ??
		getText(".badge--secondary", doc) ??
		null
	);
	if (!version) return null;
	const cleaned = version.trim();
	return cleaned && cleaned.toLowerCase() !== "version" ? cleaned : null;
}

function normalizeDocsMarkdown(markdown: string): string {
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
	body = body.replace(/\[(?:_link_|¶|​)\]\([^)]+\)/g, "");
	body = body.replace(/^\s*(?:content_copy|open_in_new|Copy)\s*$/gm, "");
	body = body.replace(/^\s*arrow_upward_alt\s+Back to the top\s*$/gm, "");
	body = body.replace(/^\[\s*Edit this page\s*\]\([^)]+\)\s*$/gm, "");
	body = body.replace(/\bCopy(?=\[)/g, "");
	body = body.replace(/\n(?:\d+\n){2,}(?=```)/g, "\n");
	body = body.replace(/[ \t]{2,}/g, " ");

	return body.replace(/\n{3,}/g, "\n\n").trim();
}

function extractMarkdownTitle(markdown: string): string | null {
	const match = markdown.match(/^#\s+(.+)$/m);
	return match?.[1]?.replace(/\[(?:_link_|¶|​)\]\([^)]+\)/g, "").trim() || null;
}

function extractDocsSearchResults(doc: Document, url: string, title: string | null): SearchResultsData | null {
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

		return {
			type: "search-results",
			title,
			url,
			engine: "documentation",
			query,
			results,
		};
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
			return {
				type: "search-results",
				title,
				url,
				engine: "documentation",
				query,
				results,
			};
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

		return {
			type: "search-results",
			title,
			url,
			engine: "documentation",
			query,
			results,
		};
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

		return {
			type: "search-results",
			title,
			url,
			engine: "documentation",
			query,
			results,
		};
	}

	return null;
}

export function parseDocsSite(html: string, url: string): DocumentationData | SearchResultsData {
	const doc = parseDocument(html);
	const rawTitle = extractTitle(doc);

	// Clean up title — strip site name suffix (e.g. "Quick Start – React" → "Quick Start")
	const title = rawTitle
		? rawTitle.replace(/\s+[–|—|·|-]\s+.{3,50}$/, "").trim() || rawTitle
		: null;

	const breadcrumb = extractBreadcrumb(doc);
	const version = extractVersion(doc);
	const searchResults = extractDocsSearchResults(doc, url, title);
	if (searchResults) {
		return searchResults;
	}

	// Find main content container
	let content: Element | null = null;
	for (const selector of CONTENT_SELECTORS) {
		try {
			content = selectOne(selector, doc) as Element | null;
			if (content && textContent(content).trim().length > 300) break;
			content = null;
		} catch {
			// Skip unsupported selector
		}
	}

	if (!content) {
		// Last resort: og:description
		const ogDesc = getAttr('meta[property="og:description"]', "content", doc);
		const ogTitle = getAttr('meta[property="og:title"]', "content", doc);
		if (ogDesc || ogTitle) {
			const t = ogTitle ?? title;
			return {
				type: "documentation",
				title: t ?? title,
				url,
				breadcrumb,
				version,
				content: ogDesc ?? "",
			};
		}
		throw new Error("No documentation content found");
	}

	// Strip navigation chrome from the content area
	removeElements(content, DOCS_NOISE);

	const md = nhm.translate(getInnerHTML(content));
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
