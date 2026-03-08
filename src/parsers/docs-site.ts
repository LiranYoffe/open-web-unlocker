/**
 * docs-site.ts — Generic documentation parser (fallback).
 *
 * Used for documentation sites that don't match a specific framework parser
 * (Docusaurus, VitePress, MkDocs, Sphinx, Devsite, MDN).
 *
 * Handles: GitHub Pages/Jekyll, Rustdoc, GitBook, W3Schools, Node.js docs,
 * and any custom static docs sites.
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { textContent } from "domutils";
import type { DocumentationData, SearchResultsData } from "./page-data";
import {
	type DocsParserConfig,
	BASE_NOISE_SELECTORS,
	getAttr,
	getText,
	parseDocsWithConfig,
} from "./docs-base";

const config: DocsParserConfig = {
	contentSelectors: [
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
	],
	noiseSelectors: BASE_NOISE_SELECTORS,
	extractBreadcrumb(doc: Document): string | null {
		const nav = selectOne('[aria-label="breadcrumb"], [aria-label="breadcrumbs"]', doc) as Element | null;
		if (nav) {
			const items = (selectAll("li, a, span", nav) as unknown as Element[])
				.map((el) => textContent(el).trim())
				.filter((t) => t && t !== "/" && t !== "›" && t !== ">" && t !== "»");
			const deduped = items.filter((item, index) => item !== items[index - 1]);
			if (deduped.length > 1) return deduped.join(" › ");
		}
		return null;
	},
	extractVersion(doc: Document): string | null {
		const version = (
			getAttr('meta[name="docsearch:version"]', "content", doc) ??
			getText(".version", doc) ??
			getText(".badge--secondary", doc) ??
			null
		);
		if (!version) return null;
		const cleaned = version.trim();
		return cleaned && cleaned.toLowerCase() !== "version" ? cleaned : null;
	},
};

export function parseDocsSite(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
