import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData, SearchResultsData } from "./page-data";

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).replace(/\s+/g, " ").trim() || null : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

function extractJsonLd(doc: Document): Record<string, unknown> | null {
	const script = selectOne('script[type="application/ld+json"]', doc) as Element | null;
	if (!script) return null;
	try {
		return JSON.parse(textContent(script)) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function getInfoBoxValue(title: string, doc: Document): string | null {
	const headings = selectAll(".detail-info-box h3.title", doc) as unknown as Element[];
	for (const heading of headings) {
		const label = textContent(heading).replace(/\s+/g, " ").trim().toLowerCase();
		if (label !== title.toLowerCase()) continue;
		let sibling = heading.nextSibling;
		while (sibling && !(sibling as Element).type) sibling = (sibling as Element).nextSibling;
		const el = sibling as Element | null;
		if (el) return textContent(el).replace(/\s+/g, " ").trim() || null;
	}
	return null;
}

export function parsePubDev(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/packages") {
		const query = parsedUrl.searchParams.get("q");
		const items = selectAll(".packages-item", doc) as unknown as Element[];
		const results = items.map((item, index) => {
			const link = selectOne(".packages-title a[href^='/packages/']", item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const publisher = selectOne(".packages-metadata a[href^='/publishers/']", item) as Element | null;
			const timeEl = selectOne(".packages-metadata a.-x-ago[title]", item) as Element | null;
			const licenseBlock = (selectAll(".packages-metadata .packages-metadata-block", item) as unknown as Element[])
				.find((el) => !selectOne("a[href^='/publishers/']", el) && !textContent(el).replace(/\s+/g, " ").trim().startsWith("v "));
			const scoreValues = (selectAll(".packages-score-value-number", item) as unknown as Element[])
				.map((el) => textContent(el).replace(/\s+/g, " ").trim());
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: new URL(href, "https://pub.dev").toString(),
				snippet: getText(".packages-description > span", item),
				author: publisher ? textContent(publisher).replace(/\s+/g, " ").trim() : null,
				version: getText(".packages-metadata a[href^='/packages/']", item),
				publishedDate: timeEl ? ((getAttributeValue(timeEl, "title") ?? textContent(timeEl).trim()) || null) : null,
				license: licenseBlock ? textContent(licenseBlock).replace(/\s+/g, " ").trim() || null : null,
				downloads: scoreValues[2] ?? null,
				dependents: scoreValues[0] ? `likes ${scoreValues[0]}` : null,
				category: (selectAll(".topics-tag", item) as unknown as Element[])
					.map((el) => textContent(el).replace(/^#/, "").trim())
					.filter(Boolean)
					.join(", ") || null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "pubdev",
			query,
			results,
		};
	}

	const jsonLd = extractJsonLd(doc);
	const name =
		(typeof jsonLd?.name === "string" ? jsonLd.name : null) ??
		getText("h1", doc)?.split(" ")[0] ??
		parsedUrl.pathname.match(/^\/packages\/([^/]+)/)?.[1] ??
		null;
	if (!name) {
		throw new Error("No pub.dev package content found");
	}

	const version =
		(typeof jsonLd?.version === "string" ? jsonLd.version : null) ??
		getText("h1 .pkg-page-title-copy-feedback .code, h1", doc)?.match(/\^?([0-9][^\s]*)/)?.[1] ??
		null;
	const description =
		(typeof jsonLd?.description === "string" ? jsonLd.description : null) ??
		getText(".detail-lead-text, .pkg-infobox-metadata + p", doc);
	const publisher = selectOne(".detail-info-box a[href^='/publishers/']", doc) as Element | null;
	const author = publisher ? textContent(publisher).replace(/\s+/g, " ").trim() : null;
	const repository = getAttr(".detail-info-box a[href*='github.com'], .detail-info-box a[href*='gitlab.com']", "href", doc);
	const homepage =
		getAttr(".detail-info-box a[href^='/documentation/']", "href", doc)
			? new URL(getAttr(".detail-info-box a[href^='/documentation/']", "href", doc)!, "https://pub.dev").toString()
			: null;
	const license = getInfoBoxValue("License", doc)?.replace(/\(license\)$/i, "").trim() ?? null;
	const keywords = (selectAll(".detail-info-box .topics-tag", doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/^#/, "").trim())
		.filter(Boolean);
	const installCopy = getAttr(".pkg-page-title-copy-icon[data-copy-content]", "data-copy-content", doc);

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "pubdev",
		name,
		version,
		description,
		author,
		license: license?.replace(/\s*\(license\)\s*/i, "").trim() || null,
		keywords: [...new Set(keywords)],
		repository,
		homepage,
		installCommand: installCopy ?? (version ? `${name}: ^${version}` : name),
	};
}
