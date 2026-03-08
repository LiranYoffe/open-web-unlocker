import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData, SearchResultsData } from "./page-data";

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).replace(/\s+/g, " ").trim() || null : null;
}

function getMeta(doc: Document, name: string, attr = "name"): string | null {
	const el = selectOne(`meta[${attr}="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function extractPropertyValue(label: string, doc: Document): string | null {
	const rows = selectAll("table.properties tr", doc) as unknown as Element[];
	for (const row of rows) {
		const header = getText("th", row);
		if (!header || !header.startsWith(label)) continue;
		return getText("td", row);
	}
	return null;
}

export function parseHackage(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/packages/search") {
		const query = parsedUrl.searchParams.get("terms");
		const rows = selectAll("#listing tr", doc) as unknown as Element[];
		const results = rows.map((row, index) => {
			const link = selectOne('td a[href^="/package/"]', row) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const cells = selectAll("td", row) as unknown as Element[];
			const tagLinks = cells[4] ? (selectAll('a[href^="/packages/tag/"]', cells[4]) as unknown as Element[]) : [];
			const maintainerLinks = cells[7] ? (selectAll('a[href^="/user/"]', cells[7]) as unknown as Element[]) : [];
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: new URL(href, "https://hackage.haskell.org").toString(),
				downloads: cells[1] ? textContent(cells[1]).replace(/\s+/g, " ").trim() || null : null,
				rating: cells[2] ? textContent(cells[2]).replace(/\s+/g, " ").trim() || null : null,
				snippet: cells[3] ? textContent(cells[3]).replace(/\s+/g, " ").trim() || null : null,
				category: tagLinks.map((el) => textContent(el).replace(/\s+/g, " ").trim()).filter(Boolean).join(", ") || null,
				publishedDate: cells[5] ? textContent(cells[5]).replace(/\s+/g, " ").trim() || null : null,
				version: cells[6] ? textContent(cells[6]).replace(/\s+/g, " ").trim() || null : null,
				author: maintainerLinks.map((el) => textContent(el).replace(/\s+/g, " ").trim()).filter(Boolean).join(", ") || null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "hackage",
			query,
			results,
		};
	}

	const headerLink = selectOne('h1 > a[href*="/package/"]', doc) as Element | null;
	const name = headerLink ? textContent(headerLink).replace(/\s+/g, " ").trim() : null;
	if (!name) {
		throw new Error("No Hackage package content found");
	}

	const version =
		getText("table.properties tr strong", doc) ??
		parsedUrl.pathname.match(/^\/package\/[^/-]+-((?:\d+\.)+\d+)/)?.[1] ??
		null;
	const description =
		getMeta(doc, "description") ??
		getMeta(doc, "og:description", "property") ??
		getText("#description p", doc);
	const maintainers = (selectAll('#maintainer-corner a[href^="/user/"]', doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const author = [...new Set(maintainers)].join(", ") || null;
	const keywords = (selectAll('a[href^="/packages/tag/"]', doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const license = getText('a[href^="/packages/tag/"]', doc);
	const externalLinks = (selectAll('table.properties a[href^="http"], #readme a[href^="http"]', doc) as unknown as Element[])
		.map((link) => ({
			text: textContent(link).replace(/\s+/g, " ").trim(),
			href: getAttributeValue(link, "href") ?? "",
		}))
		.filter((link) => Boolean(link.href));
	const repository = externalLinks.find((link) => /github|gitlab|bitbucket/i.test(link.href) || /repository|source/i.test(link.text))?.href ?? null;
	const homepage = externalLinks.find((link) => link.href !== repository)?.href ?? null;

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "hackage",
		name,
		version,
		description,
		author,
		license,
		keywords: [...new Set(keywords)],
		repository,
		homepage,
		installCommand: `cabal install ${name}`,
	};
}
