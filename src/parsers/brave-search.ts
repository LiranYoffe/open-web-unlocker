import { selectAll, selectOne } from "css-select";
import type { Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { SearchResultsData, SearchResult } from "./page-data";

export function parseBraveSearch(html: string, url: string): SearchResultsData {
	const doc = parseDocument(html);

	let query: string | null = null;
	try {
		const u = new URL(url);
		query = u.searchParams.get("q");
	} catch {
		// ignore
	}
	if (!query) {
		const input = selectOne("input[name='q']", doc) as Element | null;
		if (input) {
			query = getAttributeValue(input, "value") ?? null;
		}
	}

	const title = (() => {
		const el = selectOne("title", doc) as Element | null;
		return el ? textContent(el).trim() || null : null;
	})();

	const results: SearchResult[] = [];
	// Brave Search uses .snippet elements
	const resultElements = selectAll("#results .snippet, .fdb", doc) as unknown as Element[];

	let position = 1;
	for (const el of resultElements) {
		const linkEl = selectOne("a.result-header, a[href]", el) as Element | null;
		if (!linkEl) continue;

		const href = getAttributeValue(linkEl, "href") ?? "";
		if (!href || href.startsWith("/")) continue;

		// Title might be in a span inside the link
		const titleSpan = selectOne(".snippet-title, .title", el) as Element | null;
		const titleText = titleSpan ? textContent(titleSpan).trim() : textContent(linkEl).trim();
		if (!titleText) continue;

		let snippet: string | null = null;
		const snippetEl = selectOne(".snippet-description, .snippet-content p", el) as Element | null;
		if (snippetEl) {
			snippet = textContent(snippetEl).trim() || null;
		}

		results.push({
			position,
			title: titleText,
			url: href,
			snippet,
		});
		position++;
	}

	const relatedSearches: string[] = [];
	const relatedEls = selectAll(".related-widget a, .related-searches a", doc) as unknown as Element[];
	for (const el of relatedEls) {
		const text = textContent(el).trim();
		if (text && text.length < 200) {
			relatedSearches.push(text);
		}
	}

	return {
		type: "search-results",
		engine: "brave",
		title,
		url,
		query,
		results,
		relatedSearches: relatedSearches.length > 0 ? relatedSearches : undefined,
	};
}
