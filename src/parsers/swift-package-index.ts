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

function extractJsonLd(doc: Document): Record<string, unknown> | null {
	const script = selectOne('script[type="application/ld+json"]', doc) as Element | null;
	if (!script) return null;
	try {
		return JSON.parse(textContent(script)) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function basenameLicense(url: string | null): string | null {
	if (!url) return null;
	const match = url.match(/\/([^/]+?)(?:\.[a-z]+)?$/i);
	if (!match) return null;
	const value = match[1].trim();
	return /^license$/i.test(value) ? null : value;
}

export function parseSwiftPackageIndex(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/search" || parsedUrl.pathname === "/search/") {
		const query = parsedUrl.searchParams.get("query");
		const items = selectAll("section.package-results #package-list > li > a[href]", doc) as unknown as Element[];
		const results = items.map((item, index) => {
			const href = getAttributeValue(item, "href");
			const title = getText("h4", item);
			if (!href || !title) return null;
			const metadata = (selectAll("ul.metadata li small", item) as unknown as Element[])
				.map((el) => cleanText(textContent(el)))
				.filter((value): value is string => Boolean(value));
			const identifier = metadata.find((value) => value.includes("/")) ?? null;
			const keywords = (selectAll("ul.keywords.matching li span", item) as unknown as Element[])
				.map((el) => cleanText(textContent(el)))
				.filter((value): value is string => typeof value === "string" && value.length > 0 && !/^Matching keywords/i.test(value));
			return {
				position: index + 1,
				title,
				url: new URL(href, "https://swiftpackageindex.com").toString(),
				snippet: getText("p", item),
				author: identifier?.split("/")[0] ?? null,
				publishedDate: metadata.find((value) => /^Active /i.test(value)) ?? null,
				dependents: metadata.find((value) => /Has documentation/i.test(value)) ?? null,
				category: keywords.join(", ") || null,
				rank: metadata.find((value) => /stars$/i.test(value)) ?? null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "swift-package-index",
			query,
			results,
		};
	}

	const jsonLd = extractJsonLd(doc);
	const name =
		(typeof jsonLd?.name === "string" ? jsonLd.name : null) ??
		getText(".package-title h2", doc) ??
		null;
	if (!name) throw new Error("No Swift Package Index package content found");
	const version =
		(typeof jsonLd?.version === "string" ? jsonLd.version : null) ??
		getText(".use-this-package .version .stable", doc) ??
		null;
	const keywords = Array.isArray(jsonLd?.keywords)
		? jsonLd.keywords.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
		: [];
	const installCommand =
		getAttr(".use-this-package .version form.copyable-input input[value*='.package(url:']", "value", doc) ??
		null;
	const licenseText =
		getText("a[title$='License']", doc) ??
		(getText(".readme a[href*='/LICENSE']", doc)?.replace(/\s+licensed$/i, "") ?? null) ??
		basenameLicense(typeof jsonLd?.license === "string" ? jsonLd.license : null);
	const organization = typeof jsonLd?.sourceOrganization === "object" && jsonLd?.sourceOrganization
		? (jsonLd.sourceOrganization as Record<string, unknown>).legalName
		: null;
	const docLink = (selectAll("a[href^='http'][data-turbo='false']", doc) as unknown as Element[])
		.map((el) => ({ text: cleanText(textContent(el)), href: getAttributeValue(el, "href") ?? "" }))
		.find((link) => /^Documentation$/i.test(link.text ?? ""))?.href ?? null;

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "swift-package-index",
		name,
		version,
		description:
			(typeof jsonLd?.description === "string" ? jsonLd.description : null) ??
			getText(".package-title + p, .readme p", doc),
		author: typeof organization === "string" ? organization : getText(".package-title small a", doc),
		license: licenseText,
		keywords,
		repository: typeof jsonLd?.codeRepository === "string" ? jsonLd.codeRepository : getAttr("a[href*='github.com']", "href", doc),
		homepage: docLink,
		installCommand,
	};
}
