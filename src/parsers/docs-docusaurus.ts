/**
 * docs-docusaurus.ts — Parser for Docusaurus-based documentation sites.
 *
 * Sites: redux.js.org, redux-toolkit.js.org, docusaurus.io, trpc.io, prisma.io,
 *        jestjs.io, typeorm.io, reactnative.dev, sequelize.org, socket.io,
 *        docs.sentry.io, biomejs.dev, authjs.dev, tanstack.com, pptr.dev, etc.
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
		"article.theme-doc-markdown",
		"article.markdown",
		"article",
		"main",
		"[role='main']",
		".content",
		"body",
	],
	noiseSelectors: [
		// Exclude "header" from base — Docusaurus wraps <h1> in <header> inside articles
		...BASE_NOISE_SELECTORS.filter((s) => s !== "header"),
		".theme-doc-toc-mobile",
		".theme-doc-sidebar-container",
		".theme-doc-footer",
		".theme-doc-breadcrumbs",
	],
	extractBreadcrumb(doc: Document): string | null {
		const nav = selectOne('[aria-label="Breadcrumbs"], [aria-label="breadcrumbs"], [aria-label="breadcrumb"], .breadcrumbs', doc) as Element | null;
		if (nav) {
			const items = (selectAll("li a, li span", nav) as unknown as Element[])
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
			getText(".badge--secondary", doc) ??
			null
		);
		if (!version) return null;
		const cleaned = version.trim();
		return cleaned && cleaned.toLowerCase() !== "version" ? cleaned : null;
	},
};

export function parseDocsDocusaurus(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
