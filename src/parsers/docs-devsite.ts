/**
 * docs-devsite.ts — Parser for Google Devsite documentation.
 *
 * Sites: developers.google.com, developer.chrome.com, web.dev,
 *        firebase.google.com, developer.android.com, cloud.google.com, etc.
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
		"main#main-content article.devsite-article",
		"article.devsite-article",
		".devsite-article-body",
		"article",
		"main",
		"body",
	],
	noiseSelectors: [
		...BASE_NOISE_SELECTORS,
		".devsite-book-nav",
		"devsite-book-nav",
		".devsite-article-meta",
		".devsite-content-data",
		".devsite-content-footer",
		"devsite-content-footer",
		".devsite-banner",
		".devsite-breadcrumb-list",
	],
	extractBreadcrumb(doc: Document): string | null {
		const crumbList = selectOne(".devsite-breadcrumb-list, [aria-label='Breadcrumb']", doc) as Element | null;
		if (crumbList) {
			const items = (selectAll("li a, li span", crumbList) as unknown as Element[])
				.map((el) => textContent(el).trim())
				.filter(Boolean);
			const deduped = items.filter((item, index) => item !== items[index - 1]);
			if (deduped.length > 1) return deduped.join(" › ");
		}
		return null;
	},
	extractVersion(_doc: Document): string | null {
		return null;
	},
};

export function parseDocsDevsite(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
