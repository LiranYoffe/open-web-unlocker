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

function getMeta(doc: Document, name: string, attr = "name"): string | null {
	const el = selectOne(`meta[${attr}="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
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
			// Ignore invalid JSON
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

/**
 * NPM embeds a context object in an inline script with full package metadata.
 * Extract the `context.packument` or `context.packageVersion` data from it.
 */
function extractInlineContext(doc: Document): Record<string, unknown> | null {
	const scripts = selectAll("script", doc) as unknown as Element[];
	for (const script of scripts) {
		const raw = textContent(script);
		if (!raw.includes('"packument"') && !raw.includes('"packageVersion"')) continue;
		// The context is embedded as: {"context":{...},...}
		const jsonMatch = raw.match(/(\{"context"\s*:\s*\{.*\})\s*$/s);
		if (!jsonMatch?.[1]) continue;
		try {
			const data = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
			const ctx = data.context as Record<string, unknown> | undefined;
			if (!ctx) continue;
			// Prefer packument (has distTags), fall back to packageVersion
			return (ctx.packument ?? ctx.packageVersion ?? null) as Record<string, unknown> | null;
		} catch {
			// Ignore parse errors
		}
	}
	return null;
}

export function parseNpm(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const parsedUrl = new URL(url);
	const path = parsedUrl.pathname;

	if (path === "/search") {
		const query = parsedUrl.searchParams.get("q");
		const cards = (selectAll("main section", doc) as unknown as Element[])
			.filter((section) => selectOne('a[href^="/package/"] h3', section) || selectOne('a[href^="/package/"]', section));

		const results = cards.map((card, index) => {
			const titleLink =
				(selectOne('a[href^="/package/"]', card) as Element | null);
			if (!titleLink) return null;

			const href = getAttributeValue(titleLink, "href") ?? "";
			const resultUrl = href ? new URL(href, "https://www.npmjs.com").toString() : url;
			const title =
				getText("h3", titleLink) ??
				(textContent(titleLink).trim() || null) ??
				resultUrl;
			const snippet = getText("p", card);
			const author =
				getText('a[aria-label^="publisher "]', card) ??
				null;
			const badge = getText('span[id^="pkg-list-"]', card);
			const normalizedCardText = textContent(card).replace(/\s+/g, " ").trim();
			const metadataText =
				getText('div[class*="lh-copy"] span[aria-hidden="true"]', card) ??
				textContent(card).replace(/\s+/g, " ").trim();
			const metaMatch = metadataText.match(/•\s*([^\s•]+)\s*•\s*([^•]+?)\s*•\s*([\d,]+)\s+dependents\s*•\s*([A-Za-z0-9.+-]+)/);
			const downloadsMatch = normalizedCardText.match(/(\d[\d,]*)\s*$/);
			const licenseMatch = metadataText.match(/•\s*([A-Za-z0-9.+-]+)\s*$/);

			return {
				position: index + 1,
				title,
				url: resultUrl,
				snippet,
				resultType: badge,
				author,
				version: metaMatch?.[1] ?? null,
				publishedDate: metaMatch?.[2]?.trim() ?? null,
				dependents: metaMatch?.[3] ?? null,
				license: licenseMatch?.[1] ?? metaMatch?.[4] ?? null,
				downloads: downloadsMatch?.[1] ?? null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: pageTitle,
			url,
			engine: "npm",
			query,
			results,
		};
	}

	// Parse package name from URL
	const urlPath = path; // e.g. /package/react or /package/@scope/name
	const pkgName = urlPath.replace(/^\/package\//, "");

	let name: string | null = null;
	let version: string | null = null;
	let description: string | null = null;
	let author: string | null = null;
	let license: string | null = null;
	let keywords: string[] = [];
	let repository: string | null = null;
	let homepage: string | null = null;

	// ── Inline context data (richest source on NPM) ──────────────────────
	const packument = extractInlineContext(doc);
	if (packument) {
		name = stringVal(packument.name);
		version = stringVal(packument.version);
		description = stringVal(packument.description);
		license = stringVal(packument.license);
		repository = stringVal(packument.repository);
		homepage = stringVal(packument.homepage);

		const kw = packument.keywords;
		if (Array.isArray(kw)) {
			keywords = kw.filter((k): k is string => typeof k === "string" && k.trim() !== "");
		}

		const maintainers = packument.maintainers;
		if (Array.isArray(maintainers) && maintainers.length > 0) {
			const first = maintainers[0] as Record<string, unknown>;
			author = stringVal(first.name);
		}
	}

	// ── JSON-LD SoftwareApplication ───────────────────────────────────────
	if (!name) {
		const jsonLdItems = extractJsonLd(doc);
		const app = findByType(jsonLdItems, "SoftwareApplication");

		if (app) {
			name = stringVal(app.name);
			if (!version) version = stringVal(app.softwareVersion);
			if (!description) description = stringVal(app.description);

			if (!author) {
				const authorObj = app.author as Record<string, unknown> | undefined;
				author = authorObj
					? (stringVal(authorObj.name) ?? stringVal(authorObj as unknown as string))
					: null;
			}

			if (keywords.length === 0) {
				const kw = app.keywords;
				if (typeof kw === "string" && kw.trim()) {
					keywords = kw.split(",").map((t) => t.trim()).filter(Boolean);
				}
			}

			if (!license) license = stringVal(app.license);
			if (!repository) repository = stringVal(app.codeRepository);

			if (!homepage) {
				const homeUrl = stringVal(app.url);
				if (homeUrl && homeUrl !== `https://www.npmjs.com/package/${pkgName}`) {
					homepage = homeUrl;
				}
			}
		}
	}

	// ── DOM fallbacks ─────────────────────────────────────────────────────
	if (!name) {
		// Try sidebar license/repo from DOM
		const licenseEl = selectOne('h3:contains("License") + p', doc) as Element | null;
		if (!license && licenseEl) {
			license = textContent(licenseEl).trim() || null;
		}

		// Repository link from sidebar
		const repoLink = selectOne('a[aria-labelledby*="repository"]', doc) as Element | null;
		if (!repository && repoLink) {
			repository = getAttributeValue(repoLink, "href") ?? null;
		}
	}

	// ── og:/meta fallback ──────────────────────────────────────────────────
	const metaDesc = getMeta(doc, "description") ?? getMeta(doc, "og:description", "property");

	if (!name) {
		const ogTitle = getMeta(doc, "og:title", "property") ?? pkgName;
		name = ogTitle;

		if (metaDesc) {
			const vMatch = metaDesc.match(/Latest version:\s*([\d][^,\s]*)/);
			if (vMatch?.[1] && !version) version = vMatch[1];
			const descPart = (metaDesc.split(/\.\s+Latest version:/)[0] ?? "").trim();
			if (descPart && descPart !== metaDesc.trim() && !description) {
				description = descPart;
			}
		}
	} else if (metaDesc) {
		if (!version) {
			const vMatch = metaDesc.match(/Latest version:\s*([\d][^,\s]*)/);
			if (vMatch?.[1]) version = vMatch[1];
		}
		if (!description) {
			const descPart = (metaDesc.split(/\.\s+Latest version:/)[0] ?? "").trim();
			if (descPart && descPart.length > 10) description = descPart;
		}
	}

	const effectiveName = name ?? pkgName;
	if (!effectiveName) {
		throw new Error("No npm package content found");
	}

	const titleStr = version ? `${effectiveName} v${version}` : effectiveName;

	return {
		type: "package",
		title: titleStr || pageTitle,
		url,
		registry: "npm",
		name: effectiveName,
		version,
		description,
		author,
		license,
		keywords,
		repository,
		homepage,
		installCommand: pkgName ? `npm install ${pkgName}` : null,
	};
}
