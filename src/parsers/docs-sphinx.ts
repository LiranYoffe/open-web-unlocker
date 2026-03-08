/**
 * docs-sphinx.ts — Parser for Sphinx / ReadTheDocs documentation sites.
 *
 * Sites: docs.python.org, flask.palletsprojects.com, docs.djangoproject.com,
 *        docs.pytest.org, docs.sqlalchemy.org, *.readthedocs.io, etc.
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
		"div[role='main'] .rst-content",
		".rst-content",
		"div[role='main'] .document",
		".document .section",
		"div[role='main']",
		"article",
		"main",
		"body",
	],
	noiseSelectors: [
		...BASE_NOISE_SELECTORS,
		".toctree-wrapper",
		".admonition-title",
		".sphinxsidebar",
		".rst-footer-buttons",
		".wy-nav-side",
		".wy-breadcrumbs",
	],
	extractBreadcrumb(doc: Document): string | null {
		const nav = selectOne('[aria-label="breadcrumbs"], .wy-breadcrumbs, .breadcrumb', doc) as Element | null;
		if (nav) {
			const items = (selectAll("li, a", nav) as unknown as Element[])
				.map((el) => textContent(el).trim())
				.filter((t) => t && t !== "/" && t !== "›" && t !== ">" && t !== "»" && t !== "Docs");
			const deduped = items.filter((item, index) => item !== items[index - 1]);
			if (deduped.length > 1) return deduped.join(" › ");
		}
		// Sphinx basic theme uses .related nav with nav-items
		const related = selectOne('.related[role="navigation"], .related', doc) as Element | null;
		if (related) {
			const items = (selectAll(".nav-item a", related) as unknown as Element[])
				.map((el) => textContent(el).trim())
				.filter(Boolean);
			if (items.length > 1) return items.join(" › ");
		}
		return null;
	},
	extractVersion(doc: Document): string | null {
		const version = (
			getText(".version_switcher_placeholder", doc) ??
			getText(".version", doc) ??
			getAttr('meta[name="doc-version"]', "content", doc) ??
			getAttr('meta[name="readthedocs-version-slug"]', "content", doc) ??
			null
		);
		if (!version) return null;
		const cleaned = version.trim();
		return cleaned && cleaned.toLowerCase() !== "version" ? cleaned : null;
	},
};

export function parseDocsSphinx(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
