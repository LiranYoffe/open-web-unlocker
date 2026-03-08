/**
 * docs-nextjs.ts — Parser for Next.js documentation.
 *
 * Next.js docs use a custom app layout with a compact breadcrumb row above the
 * article title and a version picker outside the article content.
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import type { DocumentationData, SearchResultsData } from "./page-data";
import {
	type DocsParserConfig,
	BASE_NOISE_SELECTORS,
	getAttr,
	parseDocsWithConfig,
} from "./docs-base";

function getElementChildren(node: Element): Element[] {
	return node.children.filter((child): child is Element => child.type === "tag");
}

function normalizeItems(items: string[]): string[] {
	return items
		.map((item) => item.replace(/\s+/g, " ").trim())
		.filter((item) => item && item !== "/" && item !== "›" && item !== ">" && item !== "»")
		.filter((item, index, arr) => item !== arr[index - 1]);
}

function extractNextBreadcrumb(doc: Document): string | null {
	const header = selectOne("article .not-prose", doc) as Element | null;
	if (!header) return null;

	const candidates = [header, ...(selectAll("div", header) as unknown as Element[])];
	for (const candidate of candidates) {
		const children = getElementChildren(candidate);
		if (children.length < 2) continue;

		const docsLinks = children.filter(
			(child) => child.name === "a" && (getAttributeValue(child, "href") ?? "").startsWith("/docs/"),
		);
		if (docsLinks.length < 1 || docsLinks.length > 4) continue;

		const items: string[] = [];
		for (const child of children) {
			if (child.name === "a") {
				const text = textContent(child).trim();
				if (text) items.push(text);
				continue;
			}
			if (child.name !== "span") continue;
			if ((selectAll("svg", child) as unknown as Element[]).length > 0) continue;
			const text = textContent(child).trim();
			if (text) items.push(text);
		}

		const normalized = normalizeItems(items);
		if (normalized.length > 1) return normalized.join(" › ");
	}

	return null;
}

function extractNextVersion(doc: Document): string | null {
	const control = selectOne(
		'[role="combobox"][aria-label="Open version select"], button[aria-label="Open version select"]',
		doc,
	) as Element | null;
	if (!control) return null;

	const paragraphs = (selectAll("p", control) as unknown as Element[])
		.map((el) => textContent(el).trim())
		.filter(Boolean)
		.filter((text) => !/version/i.test(text));
	return paragraphs[0] ?? null;
}

const config: DocsParserConfig = {
	contentSelectors: [
		"article.mt-4",
		"article",
		".prose",
		"main",
		"[role='main']",
		"body",
	],
	noiseSelectors: [
		...BASE_NOISE_SELECTORS,
		"[data-feedback-inline]",
		"#feedback-textarea",
	],
	extractBreadcrumb(doc: Document): string | null {
		return extractNextBreadcrumb(doc);
	},
	extractVersion(doc: Document): string | null {
		return (
			getAttr('meta[name="docsearch:version"]', "content", doc) ??
			extractNextVersion(doc) ??
			null
		);
	},
};

export function parseDocsNextjs(html: string, url: string): DocumentationData | SearchResultsData {
	return parseDocsWithConfig(config, html, url);
}
