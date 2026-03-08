import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData, SearchResultsData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function extractJsonLd(doc: Document): unknown[] {
	const scripts = selectAll('script[type="application/ld+json"]', doc) as unknown as Element[];
	const results: unknown[] = [];
	for (const script of scripts) {
		const raw = textContent(script).trim();
		if (!raw) continue;
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) results.push(...parsed);
			else results.push(parsed);
		} catch {
			// Ignore
		}
	}
	return results;
}

function findByType(items: unknown[], type: string): Record<string, unknown> | null {
	for (const item of items) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] === type) return obj;
		if (Array.isArray(obj["@graph"])) {
			const found = findByType(obj["@graph"] as unknown[], type);
			if (found) return found;
		}
	}
	return null;
}

function stringVal(v: unknown): string | null {
	return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function parsePypi(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const parsedUrl = new URL(url);
	const path = parsedUrl.pathname;

	if (path === "/search/" || path === "/search") {
		const query = parsedUrl.searchParams.get("q");
		const mainText = textContent((selectOne("main", doc) as Element | null) ?? doc).replace(/\s+/g, " ").trim();
		const totalMatch = mainText.match(/([\d,+]+)\s+projects?\s+for\s+"([^"]+)"/i);
		const cards = selectAll("a.package-snippet", doc) as unknown as Element[];

		const results = cards.map((card, index) => {
			const href = getAttributeValue(card, "href") ?? "";
			const resultUrl = href ? new URL(href, "https://pypi.org").toString() : url;
			const title = getText(".package-snippet__name", card) ?? resultUrl;
			const snippet = getText(".package-snippet__description", card);
			const timeEl = selectOne("time[datetime]", card) as Element | null;
			const publishedDate =
				(timeEl ? (getAttributeValue(timeEl, "datetime") ?? null) : null) ??
				getText(".package-snippet__created", card);

			return {
				position: index + 1,
				title,
				url: resultUrl,
				snippet,
				publishedDate: publishedDate?.trim() || null,
			};
		});

		return {
			type: "search-results",
			title: pageTitle,
			url,
			engine: "pypi",
			query: query ?? totalMatch?.[2] ?? null,
			results,
		};
	}

	// Parse package name from URL path: /project/<name>/
	const pkgName = path.replace(/^\/project\//, "").replace(/\/$/, "");

	let name: string | null = null;
	let version: string | null = null;
	let description: string | null = null;
	let author: string | null = null;
	let license: string | null = null;
	let keywords: string[] = [];
	let repository: string | null = null;
	let homepage: string | null = null;

	// ── JSON-LD SoftwareApplication ───────────────────────────────────────
	const jsonLdItems = extractJsonLd(doc);
	const app = findByType(jsonLdItems, "SoftwareApplication");

	if (app) {
		name = stringVal(app.name);
		version = stringVal(app.softwareVersion);
		description = stringVal(app.description);

		const authorObj = app.author as Record<string, unknown> | undefined;
		author = authorObj ? stringVal(authorObj.name) : null;

		license = stringVal(app.license);

		const kw = app.keywords;
		if (typeof kw === "string" && kw.trim()) {
			keywords = kw.split(",").map((t) => t.trim()).filter(Boolean);
		}

		repository = stringVal(app.codeRepository);
	}

	// ── DOM fallbacks ─────────────────────────────────────────────────────
	if (!name) {
		const header = getText(".package-header__name", doc);
		if (header) {
			// Header contains "name version" — split them
			const parts = header.trim().split(/\s+/);
			if (parts.length >= 2 && /^\d/.test(parts[parts.length - 1] ?? "")) {
				name = parts.slice(0, -1).join(" ");
				if (!version) version = parts[parts.length - 1] ?? null;
			} else {
				name = header;
			}
		}
	}

	if (!description) {
		const desc = getText(".project-description", doc);
		if (desc) {
			description = desc.length > 5000 ? `${desc.slice(0, 5000)}\n\n...` : desc;
		}
	}

	// ── Sidebar Meta section: license, author, requires ───────────────────
	// PyPI renders <strong>Label:</strong> value pairs inside .sidebar-section li
	const metaItems = selectAll(".sidebar-section li", doc) as unknown as Element[];
	for (const li of metaItems) {
		const raw = textContent(li).trim();
		if (!license && raw.startsWith("License:")) {
			license = raw.replace(/^License:\s*/, "").trim() || null;
		} else if (!author && raw.startsWith("Author:")) {
			author = raw.replace(/^Author:\s*/, "").trim() || null;
		}
	}

	// ── Project links: repository, homepage ───────────────────────────────
	// Links are in "Project links" section with text labels like "Source", "Homepage"
	const projectLinks = selectAll(".sidebar-section a", doc) as unknown as Element[];
	for (const a of projectLinks) {
		const href = getAttributeValue(a, "href") ?? "";
		const linkText = textContent(a).trim().toLowerCase();
		if (!href.startsWith("http")) continue;
		if (!repository && (linkText.includes("source") || /github\.com|gitlab\.com/.test(href))) {
			repository = href;
		} else if (!homepage && (linkText.includes("documentation") || linkText.includes("homepage"))) {
			homepage = href;
		}
	}

	const effectiveName = name ?? pkgName;
	if (!effectiveName && !description) {
		throw new Error("No PyPI package content found");
	}

	const titleStr = effectiveName
		? version ? `${effectiveName} ${version}` : effectiveName
		: pageTitle ?? "";

	return {
		type: "package",
		title: titleStr,
		url,
		registry: "pypi",
		name: effectiveName || null,
		version,
		description: description ?? null,
		author,
		license,
		keywords,
		repository,
		homepage,
		installCommand: effectiveName ? `pip install ${effectiveName}` : null,
	};
}
