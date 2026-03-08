import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData, SearchResultsData } from "./page-data";

function cleanText(value: string | null | undefined): string | null {
	return value?.replace(/\s+/g, " ").trim() || null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? cleanText(textContent(el)) : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

function getMeta(doc: Document, name: string): string | null {
	const el = selectOne(`meta[name="${name}"], meta[property="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function extractInstallCommand(html: string): string | null {
	const match =
		html.match(/data-copy="((?:deno add|bunx jsr add)[^"]+)"/) ??
		html.match(/data-copy="(import \* as [^"]+jsr:[^"]+)"/);
	return match?.[1]?.replace(/&quot;/g, '"').trim() ?? null;
}

function extractSummaryMetric(html: string, label: string): string | null {
	const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = html.match(new RegExp(`<span class="font-semibold">${escaped}</span><(?:div|span)>([^<]+)</(?:div|span)>`, "i"));
	return match?.[1]?.trim() ?? null;
}

export function parseJsr(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/packages" || parsedUrl.pathname === "/packages/") {
		const query = parsedUrl.searchParams.get("search");
		const items = selectAll("#main-content ul > li > a[href^='/@']", doc) as unknown as Element[];
		const results = items.map((item, index) => {
			const href = getAttributeValue(item, "href");
			if (!href) return null;
			const title = getText("span.font-semibold", item);
			if (!title) return null;
			const runtimes = (selectAll("span.sr-only", item) as unknown as Element[])
				.map((el) => cleanText(textContent(el)))
				.filter((value): value is string => Boolean(value))
				.join(", ");
			const scope = title.startsWith("@") ? title.split("/")[0] : null;
			const score = getText(".score-circle [title='Package score'], .score-circle .min-w-6", item);
			return {
				position: index + 1,
				title,
				url: new URL(href, "https://jsr.io").toString(),
				snippet: getText(".text-sm.text-tertiary", item),
				author: scope,
				category: runtimes || null,
				rank: score ? `${score}%` : null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "jsr",
			query,
			results,
		};
	}

	const name = getText("h1 a[aria-label^='Package: ']", doc) ?? parsedUrl.pathname.split("/").filter(Boolean).at(-1) ?? null;
	if (!name) throw new Error("No JSR package content found");
	const scope = getText("h1 a[aria-label^='Scope: ']", doc);
	const version =
		getText("h1 span[aria-label^='Version: ']", doc)?.replace(/^@/, "") ??
		null;
	const keywords = (selectAll("a[href^='/keywords/']", doc) as unknown as Element[])
		.map((el) => cleanText(textContent(el))?.replace(/\d+(?:\.\d+)?[kKmM]?$/, ""))
		.filter((value): value is string => Boolean(value));
	const repository = getAttr("a[aria-label='GitHub repository']", "href", doc);
	const description =
		getText("p.text-secondary.text-base.max-w-3xl.mb-6", doc) ??
		getMeta(doc, "description")?.replace(/^.+ on JSR:\s*/i, "") ??
		null;
	const docHref = getAttr("a[href$='/doc']", "href", doc);

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "jsr",
		name: scope ? `${scope}/${name}` : name,
		version,
		description,
		author: scope,
		license: extractSummaryMetric(html, "License"),
		keywords: [...new Set(keywords)],
		repository,
		homepage: docHref ? new URL(docHref, "https://jsr.io").toString() : null,
		installCommand: extractInstallCommand(html),
	};
}
