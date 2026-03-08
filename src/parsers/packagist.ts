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

function parseNameFromUrl(url: string): string | null {
	const match = new URL(url).pathname.match(/^\/packages\/([^/]+\/[^/]+)\/?$/);
	return match?.[1] ?? null;
}

export function parsePackagist(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/search/" || parsedUrl.pathname === "/search") {
		const query = parsedUrl.searchParams.get("q") ?? parsedUrl.searchParams.get("query");
		const items = selectAll(".search-list .package-item", doc) as unknown as Element[];
		const results = items.map((item, index) => {
			const link = selectOne('h4 a[href^="/packages/"], h4 a[href^="https://packagist.org/packages/"]', item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const metadataBlocks = (selectAll(".metadata-block", item) as unknown as Element[])
				.map((block) => textContent(block).replace(/\s+/g, " ").trim())
				.filter(Boolean);
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: new URL(href, "https://packagist.org").toString(),
				snippet: getText(".col-sm-9 p:not(.language):not(.abandoned)", item),
				category: getText(".language", item),
				downloads: metadataBlocks[0] ?? null,
				stars: metadataBlocks[1] ?? null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "packagist",
			query,
			results,
		};
	}

	if (parsedUrl.pathname === "/explore/" || parsedUrl.pathname === "/explore" || parsedUrl.pathname.startsWith("/explore/")) {
		const sections = selectAll("section.packages-short", doc) as unknown as Element[];
		const results: SearchResultsData["results"] = [];
		let position = 1;

		for (const section of sections) {
			const category = getText("h3", section)?.replace(/\s+RSS$|\s+View All$|\s+See more\.\.\.$/g, "").trim() ?? null;
			const items = selectAll("ul.list-unstyled > li", section) as unknown as Element[];
			for (const item of items) {
				const link = selectOne('a[href^="/packages/"]', item) as Element | null;
				const href = link ? getAttributeValue(link, "href") : null;
				if (!link || !href) continue;
				const title = textContent(link).replace(/\s+/g, " ").trim();
				if (!title || /^See more/i.test(title)) continue;
				const version = getText("strong", link);
				const itemText = textContent(item).replace(/\s+/g, " ").trim();
				const snippet = itemText
					.replace(title, "")
					.replace(version ?? "", "")
					.replace(/\s+/g, " ")
					.trim() || null;
				results.push({
					position,
					title: title.replace(version ?? "", "").trim(),
					url: new URL(href, "https://packagist.org").toString(),
					snippet,
					category,
					version,
				});
				position += 1;
			}
		}

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "packagist",
			query: parsedUrl.searchParams.get("type"),
			results,
		};
	}

	const name = parseNameFromUrl(url);
	if (!name) {
		throw new Error("No Packagist package content found");
	}

	const version =
		getText(".versions .version-number", doc)?.replace(/^v/i, "") ??
		null;
	const description =
		getText("p.description", doc) ??
		getMeta(doc, "description");
	const authorEntries = (selectAll("ul.authors li", doc) as unknown as Element[])
		.map((li) => textContent(li).replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.map((entry) => entry.replace(/\s*<[^>]+>.*/, "").trim());
	const maintainerEntries = (selectAll("p.maintainers img[title]", doc) as unknown as Element[])
		.map((img) => getAttributeValue(img, "title") ?? "")
		.filter(Boolean);
	const author = [...new Set([...authorEntries, ...maintainerEntries])].join(", ") || null;
	const license =
		getText(".metadata .license", doc)?.replace(/\s+Source Reference[\s\S]*$/i, "").trim() ??
		null;
	const repositoryEl = selectOne(".canonical a[href^='http']", doc) as Element | null;
	const repository = repositoryEl ? (getAttributeValue(repositoryEl, "href") ?? null) : null;
	const homepage = (selectAll("a[href^='http']", doc) as unknown as Element[])
		.map((link) => ({
			text: textContent(link).replace(/\s+/g, " ").trim(),
			href: getAttributeValue(link, "href") ?? "",
		}))
		.find((link) => /^homepage$/i.test(link.text))?.href ?? null;

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "packagist",
		name,
		version,
		description,
		author,
		license,
		keywords: [],
		repository,
		homepage,
		installCommand: `composer require ${name}`,
	};
}
