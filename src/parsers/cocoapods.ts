import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData } from "./page-data";

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).replace(/\s+/g, " ").trim() || null : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

function getPropertyValue(label: string, doc: Document): string | null {
	const rows = selectAll("table tr", doc) as unknown as Element[];
	for (const row of rows) {
		const cells = selectAll("td", row) as unknown as Element[];
		if (cells.length < 2) continue;
		const key = textContent(cells[0]!).replace(/\s+/g, " ").trim().toLowerCase();
		if (!key.includes(label.toLowerCase())) continue;
		return textContent(cells[1]!).replace(/\s+/g, " ").trim() || null;
	}
	return null;
}

export function parseCocoaPods(html: string, url: string): PackageData {
	const doc = parseDocument(html);
	const name = getText("h1.hidden-xs a, .inline-headline h1 a", doc);
	if (!name) {
		throw new Error("No CocoaPods package content found");
	}

	const version = getText("h1.hidden-xs span, .inline-headline h1 span", doc);
	const description =
		getAttr('meta[name="description"]', "content", doc) ??
		getText(".pod-result p, .readme-content article > p", doc);
	const authorList = (selectAll(".attribution li", doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/\s+/g, " ").trim())
		.filter((text) => text && text.toLowerCase() !== "by");
	const maintainerNames = (selectAll("p a[href^='/owners/']", doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const author = [...new Set([...authorList, ...maintainerNames])].join(", ") || null;
	const license = getPropertyValue("license", doc);
	const repoLinks = (selectAll(".links a[href^='http'], nav a[href^='http']", doc) as unknown as Element[])
		.map((el) => ({
			text: textContent(el).replace(/\s+/g, " ").trim(),
			href: getAttributeValue(el, "href") ?? "",
		}));
	const repository =
		repoLinks.find((link) => /github repo/i.test(link.text))?.href ??
		repoLinks.find((link) => /github\.com|gitlab\.com/.test(link.href) && !/podspec/i.test(link.text))?.href ??
		null;
	const homepage = getAttr(".links a[href*='github.io'], .links a[href*='Documentation']", "href", doc);
	const installCommand = getText("#installation_guide code", doc) ?? (name ? `pod '${name}'` : null);

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "cocoapods",
		name,
		version,
		description,
		author,
		license,
		keywords: [],
		repository,
		homepage,
		installCommand,
	};
}
