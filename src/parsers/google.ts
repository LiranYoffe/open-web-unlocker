import { selectAll, selectOne } from "css-select";
import type { Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { SearchResultsData, SearchResult } from "./page-data";

export function parseGoogle(html: string, url: string): SearchResultsData {
	const doc = parseDocument(html);

	// Extract query from URL or input field
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

	// Extract search results
	const results: SearchResult[] = [];
	const resultElements = selectAll("#search .g, #rso .g", doc) as unknown as Element[];

	let position = 1;
	for (const el of resultElements) {
		const linkEl = selectOne("a[href]", el) as Element | null;
		if (!linkEl) continue;

		const href = getAttributeValue(linkEl, "href") ?? "";
		if (!href || href.startsWith("/") || href.startsWith("#")) continue;

		const h3 = selectOne("h3", el) as Element | null;
		const titleText = h3 ? textContent(h3).trim() : textContent(linkEl).trim();
		if (!titleText) continue;

		// Snippet: look for common snippet containers
		let snippet: string | null = null;
		const snippetEl = selectOne("[data-sncf], .VwiC3b, .s3v9rd, [data-content-feature='1']", el) as Element | null;
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

	// Featured snippet
	let featuredSnippet: SearchResultsData["featuredSnippet"] = null;
	const fsEl = selectOne(".xpdopen .hgKElc, [data-attrid='wa:/description'] .kno-rdesc span, .IZ6rdc", doc) as Element | null;
	if (fsEl) {
		const fsText = textContent(fsEl).trim();
		if (fsText) {
			featuredSnippet = { text: fsText };
		}
	}

	// Related searches
	const relatedSearches: string[] = [];
	const relatedEls = selectAll("#botstuff .k8XOCe, .brs_col a, [data-q]", doc) as unknown as Element[];
	for (const el of relatedEls) {
		const text = textContent(el).trim();
		if (text && text.length < 200) {
			relatedSearches.push(text);
		}
	}

	return {
		type: "search-results",
		engine: "google",
		title,
		url,
		query,
		results,
		featuredSnippet,
		relatedSearches: relatedSearches.length > 0 ? relatedSearches : undefined,
	};
}
