/**
 * docs-vitepress.ts — Parser for VitePress-based documentation sites.
 *
 * Sites: vuejs.org, vueuse.org, router.vuejs.org, pinia.vuejs.org, vite.dev,
 *        vitejs.dev, rollupjs.org, vitepress.dev, valibot.dev, rspack.dev, etc.
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
		".vp-doc",
		".content-container .content",
		"main",
		"article",
		"[role='main']",
		"body",
	],
	noiseSelectors: [
		...BASE_NOISE_SELECTORS,
		".VPSidebar",
		".VPNav",
		".VPFooter",
		".VPDocFooter",
		".aside-container",
		".edit-link-button",
	],
	extractBreadcrumb(doc: Document): string | null {
		// VitePress typically doesn't render breadcrumbs, but try sidebar active path
		const activeItems = selectAll(".VPSidebar .is-active", doc) as unknown as Element[];
		if (activeItems.length > 1) {
			const parts = activeItems.map((el) => textContent(el).trim()).filter(Boolean);
			if (parts.length > 1) return parts.join(" › ");
		}
		return null;
	},
	extractVersion(_doc: Document): string | null {
		// VitePress sites rarely show version in page chrome
		return null;
	},
};

export function parseDocsVitepress(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
