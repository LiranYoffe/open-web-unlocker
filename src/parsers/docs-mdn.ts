/**
 * docs-mdn.ts — Parser for MDN Web Docs.
 *
 * Sites: developer.mozilla.org
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
		"#content.layout__content",
		".layout__content",
		"article",
		"main",
		"body",
	],
	noiseSelectors: [
		...BASE_NOISE_SELECTORS,
		".sidebar",
		".document-toc",
		".metadata",
		".on-github",
		".bc-table",
		".page-footer",
		".article-footer",
		"#on-github",
		".article-actions-container",
	],
	extractBreadcrumb(doc: Document): string | null {
		const nav = selectOne('[aria-label="breadcrumb"], .breadcrumbs', doc) as Element | null;
		if (nav) {
			const items = (selectAll("li a, li", nav) as unknown as Element[])
				.map((el) => textContent(el).trim())
				.filter((t) => t && t !== "/" && t !== "›" && t !== ">" && t !== "»");
			const deduped = items.filter((item, index) => item !== items[index - 1]);
			if (deduped.length > 1) return deduped.join(" › ");
		}
		return null;
	},
	extractVersion(_doc: Document): string | null {
		return null;
	},
};

export function parseDocsMdn(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
