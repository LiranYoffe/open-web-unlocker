/**
 * docs-mkdocs.ts — Parser for MkDocs Material documentation sites.
 *
 * Sites: kubernetes.io, fastapi.tiangolo.com, docs.pnpm.io, pnpm.io,
 *        helm.sh, docs.docker.com, etc.
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { textContent } from "domutils";
import type { DocumentationData, SearchResultsData } from "./page-data";
import {
	type DocsParserConfig,
	BASE_NOISE_SELECTORS,
	parseDocsWithConfig,
} from "./docs-base";

const config: DocsParserConfig = {
	contentSelectors: [
		"article.md-content__inner",
		".md-content .md-typeset",
		".md-typeset",
		"article",
		"main",
		"[role='main']",
		"body",
	],
	noiseSelectors: [
		...BASE_NOISE_SELECTORS,
		".md-sidebar",
		".md-footer",
		".md-header",
		".md-search",
		".md-tabs",
		".md-source",
	],
	extractBreadcrumb(doc: Document): string | null {
		// Try the actual breadcrumb path first (MkDocs Material ≥ 9)
		const mdPath = selectOne(".md-path", doc) as Element | null;
		if (mdPath) {
			const items = (selectAll(".md-path__item", mdPath) as unknown as Element[])
				.map((el) => textContent(el).trim())
				.filter(Boolean);
			if (items.length > 1) return items.join(" › ");
		}
		// Fall back to aria-label breadcrumb
		const nav = selectOne('[aria-label="breadcrumb"]', doc) as Element | null;
		if (nav) {
			const items = (selectAll("li, a", nav) as unknown as Element[])
				.map((el) => textContent(el).trim())
				.filter((t) => t && t !== "/" && t !== "›" && t !== ">" && t !== "»");
			const deduped = items.filter((item, index) => item !== items[index - 1]);
			if (deduped.length > 1) return deduped.join(" › ");
		}
		return null;
	},
	extractVersion(_doc: Document): string | null {
		// MkDocs Material doesn't typically expose version in DOM
		return null;
	},
};

export function parseDocsMkdocs(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
