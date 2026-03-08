import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData, SearchResultsData } from "./page-data";

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).replace(/\s+/g, " ").trim() || null : null;
}

function getMeta(doc: Document, name: string): string | null {
	const el = selectOne(`meta[name="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

export function parseHex(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/packages") {
		const query = parsedUrl.searchParams.get("search");
		const items = selectAll(".exact-match li, .packages-list li", doc) as unknown as Element[];
		const seen = new Set<string>();
		const results = items.map((item, index) => {
			const link = selectOne("a[href^='/packages/']", item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const resultUrl = new URL(href, "https://hex.pm").toString();
			if (seen.has(resultUrl)) return null;
			seen.add(resultUrl);
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: resultUrl,
				snippet: getText("p", item),
				version: getText(".version", item),
				downloads: getText(".download-count", item)?.replace(/\s+/g, " ") ?? null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "hex",
			query,
			results,
		};
	}

	const match = parsedUrl.pathname.match(/^\/packages\/([^/]+)\/?$/);
	const name = match?.[1] ?? null;
	if (!name) {
		throw new Error("No Hex package content found");
	}

	const version = getText(".package-title .version", doc);
	const description =
		getText(".description p", doc) ??
		getMeta(doc, "description");
	const ownerNames = (selectAll(".owners-list a[title], .owners-list img[title]", doc) as unknown as Element[])
		.map((el) => getAttributeValue(el, "title") ?? textContent(el).trim())
		.filter(Boolean);
	const publisher = getText(".publisher a, .publisher", doc);
	const author = [...new Set([...ownerNames, ...(publisher ? [publisher] : [])])].join(", ") || null;
	const license = getText(".license", doc);
	const links = (selectAll("ul.links a[href^='http']", doc) as unknown as Element[]).map((link) => ({
		text: textContent(link).replace(/\s+/g, " ").trim(),
		href: getAttributeValue(link, "href") ?? "",
	}));
	const repository = links.find((link) => /github|gitlab/i.test(link.href) || /github/i.test(link.text))?.href ?? null;
	const homepage = links.find((link) => !/repo\.hex\.pm|github|gitlab/i.test(link.href))?.href ?? null;

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "hex",
		name,
		version,
		description,
		author,
		license,
		keywords: [],
		repository,
		homepage,
		installCommand: version ? `{:${name}, "~> ${version}"}` : `{:${name}}`,
	};
}
