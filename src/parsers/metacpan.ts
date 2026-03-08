import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData, SearchResultsData } from "./page-data";

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).replace(/\s+/g, " ").trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const byName = selectOne(`meta[name="${property}"]`, doc) as Element | null;
	if (byName) return getAttributeValue(byName, "content") ?? null;
	const byProp = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return byProp ? (getAttributeValue(byProp, "content") ?? null) : null;
}

export function parseMetacpan(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/search") {
		const query = parsedUrl.searchParams.get("q");
		const items = selectAll("main.search-results .module-result", doc) as unknown as Element[];
		const results = items.map((item, index) => {
			const link = selectOne("h3 a[href]", item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const headingText = getText("h3", item) ?? "";
			const title = textContent(link).replace(/\s+/g, " ").trim();
			const snippet = headingText.replace(title, "").replace(/^-\s*/, "").trim() || getText("p", item);
			return {
				position: index + 1,
				title,
				url: new URL(href, "https://metacpan.org").toString(),
				snippet,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "metacpan",
			query,
			results,
		};
	}

	const name = parsedUrl.pathname.replace(/^\/pod\//, "").replace(/\/$/, "") || null;
	if (!name) {
		throw new Error("No MetaCPAN package content found");
	}

	const sidebarText = textContent((selectOne("nav.sidebar", doc) as Element | null) ?? doc).replace(/\s+/g, " ").trim();
	const version = sidebarText.match(/Module version:\s*([^\s]+)/i)?.[1] ?? null;
	const license = sidebarText.match(/License:\s*([^\s]+)/i)?.[1] ?? null;
	const description =
		getMeta(doc, "description") ??
		getMeta(doc, "og:description") ??
		getText(".pod p", doc);
	const repository = (selectAll("a[href^='http']", doc) as unknown as Element[])
		.map((link) => ({
			text: textContent(link).replace(/\s+/g, " ").trim(),
			href: getAttributeValue(link, "href") ?? "",
		}))
		.find((link) => /^repository$/i.test(link.text) || /github|gitlab/i.test(link.href))?.href ?? null;
	const homepage = (selectAll("a[href^='http']", doc) as unknown as Element[])
		.map((link) => ({
			text: textContent(link).replace(/\s+/g, " ").trim(),
			href: getAttributeValue(link, "href") ?? "",
		}))
		.find((link) => /^homepage$/i.test(link.text))?.href ?? null;
	const authors = (selectAll("a[href^='/author/']", doc) as unknown as Element[])
		.map((link) => textContent(link).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const author = [...new Set(authors)].slice(0, 5).join(", ") || null;

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "metacpan",
		name,
		version,
		description,
		author,
		license,
		keywords: [],
		repository,
		homepage,
		installCommand: `cpanm ${name}`,
	};
}
