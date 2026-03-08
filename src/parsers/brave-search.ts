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

	// AI summary (chatllm / Leo)
	let featuredSnippet: SearchResultsData["featuredSnippet"] = null;
	const aiSummary = selectOne("#llm-snippet .chatllm-content, .chatllm-content", doc) as Element | null;
	if (aiSummary) {
		const text = textContent(aiSummary).replace(/\s+/g, " ").trim();
		if (text) {
			featuredSnippet = { text };
		}
	}

	const results: SearchResult[] = [];
	const resultElements = selectAll('#results .snippet[data-type="web"]', doc) as unknown as Element[];

	let position = 1;
	for (const el of resultElements) {
		const linkEl = selectOne("a[href]", el) as Element | null;
		if (!linkEl) continue;

		const href = getAttributeValue(linkEl, "href") ?? "";
		if (!href || href.startsWith("/")) continue;

		const titleEl = selectOne(".search-snippet-title, .title", el) as Element | null;
		const titleText = titleEl ? textContent(titleEl).trim() : textContent(linkEl).trim();
		if (!titleText) continue;

		let snippet: string | null = null;
		// Standard web result snippet
		const snippetEl = selectOne(".generic-snippet .content, .snippet-description", el) as Element | null;
		if (snippetEl) {
			snippet = textContent(snippetEl).replace(/\s+/g, " ").trim() || null;
		}
		// Reddit inline Q&A results have no .generic-snippet — extract from inline-qa
		if (!snippet) {
			const qaEl = selectOne("inline-qa-question, .inline-qa", el) as Element | null;
			if (qaEl) {
				snippet = textContent(qaEl).replace(/\s+/g, " ").trim() || null;
			}
		}

		const displayUrlEl = selectOne("cite.snippet-url", el) as Element | null;
		const displayUrl = displayUrlEl ? textContent(displayUrlEl).trim() || undefined : undefined;

		results.push({
			position,
			title: titleText,
			url: href,
			snippet,
			displayUrl,
		});
		position++;
	}

	// FAQ / People Also Ask
	const faqItems = selectAll(".faq-item", doc) as unknown as Element[];
	const relatedSearches: string[] = [];
	for (const faq of faqItems) {
		const question = textContent(
			(selectOne("summary .title, summary, .question, .accordion-header, [role='button']", faq) as Element | null) ?? faq,
		).replace(/\s+/g, " ").trim();
		if (question && question.length < 300) {
			relatedSearches.push(question);
		}
	}

	// Traditional related searches
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
		featuredSnippet,
		relatedSearches: relatedSearches.length > 0 ? relatedSearches : undefined,
	};
}
