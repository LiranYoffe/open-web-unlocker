import { selectAll, selectOne } from "css-select";
import type { Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { SearchResultsData, SearchResult } from "./page-data";

export function parseBing(html: string, url: string): SearchResultsData {
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
	const resultElements = selectAll("#b_results .b_algo", doc) as unknown as Element[];

	let position = 1;
	for (const el of resultElements) {
		const linkEl = selectOne("h2 a", el) as Element | null;
		if (!linkEl) continue;

		const href = getAttributeValue(linkEl, "href") ?? "";
		if (!href || href.startsWith("/")) continue;

		const titleText = textContent(linkEl).trim();
		if (!titleText) continue;

		let snippet: string | null = null;
		const snippetEl = selectOne(".b_caption p, .b_paractl", el) as Element | null;
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
	const relatedEls = selectAll(".b_rs a, #b_rs a", doc) as unknown as Element[];
	for (const el of relatedEls) {
		const text = textContent(el).trim();
		if (text && text.length < 200) {
			relatedSearches.push(text);
		}
	}

	return {
		type: "search-results",
		engine: "bing",
		title,
		url,
		query,
		results,
		relatedSearches: relatedSearches.length > 0 ? relatedSearches : undefined,
	};
}
