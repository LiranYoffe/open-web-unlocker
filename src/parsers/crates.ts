/**
 * crates.ts — Parser for crates.io package pages.
 *
 * crates.io is a JavaScript SPA (Ember) — pages must be fetched with
 * browser_dc so the DOM is fully rendered before parsing.
 *
 * All CSS class names are hashed (CSS Modules); stable selectors used:
 *   - URL path for name / version
 *   - h1 > small for rendered version number
 *   - meta[name="description"] / meta[property="og:description"] for description
 *   - h1 + div as structural fallback for description
 *   - a[href*="choosealicense.com"] for license
 *   - a[href^="/keywords/"] for keywords
 *   - a[href*="github.com|gitlab.com"] inside section[aria-label="Crate metadata"]
 *     for repository
 *   - a[href^="/users/"] + a[href^="/teams/"] for owners/author
 */

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

function pkgNameFromUrl(url: string): string {
	const pathname = new URL(url).pathname;
	const stripped = pathname.replace(/^\/crates\//, "");
	return stripped.split("/")[0] ?? "";
}

function pkgVersionFromUrl(url: string): string | null {
	const pathname = new URL(url).pathname;
	const stripped = pathname.replace(/^\/crates\//, "");
	const parts = stripped.split("/").filter(Boolean);
	return parts.length >= 2 ? (parts[1] ?? null) : null;
}

export function parseCrates(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const parsedUrl = new URL(url);
	if (parsedUrl.pathname === "/search") {
		const query = parsedUrl.searchParams.get("q");
		const items = (selectAll("ol > li", doc) as unknown as Element[])
			.filter((item) => selectOne('a[href^="/crates/"]', item));

		const results = items.map((item, index) => {
			const link = selectOne('a[href^="/crates/"]', item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const version = getText("span.version", item)?.replace(/^v/, "") ?? null;
			const snippet = getText('div[role="heading"] + div', item);
			const normalizedText = textContent(item).replace(/\s+/g, " ").trim();
			const allTimeDownloads = normalizedText.match(/All-Time:\s*([\d,]+)/i)?.[1] ?? null;
			const recentDownloads = normalizedText.match(/Recent:\s*([\d,]+)/i)?.[1] ?? null;
			const updated = getText("time", item);
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: new URL(href, "https://crates.io").toString(),
				snippet,
				version,
				downloads: allTimeDownloads,
				dependents: recentDownloads ? `Recent ${recentDownloads}` : null,
				publishedDate: updated,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: pageTitle,
			url,
			engine: "crates",
			query,
			results,
		};
	}

	const nameFromUrl = pkgNameFromUrl(url);
	const versionFromUrl = pkgVersionFromUrl(url);

	// ── Name ──────────────────────────────────────────────────────────────
	// URL is the most reliable source; h1 > span as a rendered fallback.
	const nameFromH1 = getText("h1 span", doc);
	let name: string | null = nameFromUrl || nameFromH1 || null;

	// ── Version ───────────────────────────────────────────────────────────
	// Ember renders the version as <small> inside the <h1>: "v1.0.228"
	const versionRaw = getText("h1 small", doc) ?? versionFromUrl;
	const version = versionRaw ? versionRaw.replace(/^v/, "").trim() || null : null;

	// ── Description ───────────────────────────────────────────────────────
	// Ember injects meta[name="description"] into the <head>.
	// Structural fallback: the description div is the immediate sibling of h1.
	let description: string | null =
		getMeta(doc, "description") ?? getMeta(doc, "og:description", "property");

	if (!description) {
		// h1 + div: the description is the div immediately following the h1
		const descEl = selectOne("h1 + div", doc) as Element | null;
		if (descEl) {
			const text = textContent(descEl).trim();
			// Sanity-check: short text without newlines (not a complex content block)
			if (text && text.length < 600 && !text.includes("\n")) {
				description = text;
			}
		}
	}

	// ── Metadata section ──────────────────────────────────────────────────
	// The sidebar has a stable aria-label: section[aria-label="Crate metadata"]
	const metaSection = selectOne('section[aria-label="Crate metadata"]', doc) as Element | null;
	const metaRoot: Document | Element = metaSection ?? doc;

	// ── License ───────────────────────────────────────────────────────────
	// License links point to choosealicense.com — uniquely stable.
	let license: string | null = null;
	const licenseAnchors = selectAll('a[href*="choosealicense.com"]', metaRoot) as unknown as Element[];
	if (licenseAnchors.length > 0) {
		const names = [...new Set(
			licenseAnchors.map((a) => textContent(a).trim()).filter(Boolean),
		)];
		license = names.join(" OR ");
	}

	// ── Repository & Homepage ─────────────────────────────────────────────
	// crates.io sidebar labels links with visible text: "Repository", "Homepage",
	// "Documentation". Use label text as the primary discriminator.
	let repository: string | null = null;
	let homepage: string | null = null;
	const metaAnchors = selectAll("a", metaRoot) as unknown as Element[];

	for (const a of metaAnchors) {
		const href = getAttributeValue(a, "href") ?? "";
		if (!href.startsWith("http")) continue;
		const text = textContent(a).trim();
		// Skip icon-only links (empty text) — e.g. the PURL spec link has no text
		if (!text) continue;
		if (!repository && /github\.com|gitlab\.com/.test(href)) {
			repository = href;
		} else if (
			!homepage &&
			!href.includes("choosealicense.com") &&
			!href.includes("github.com") &&
			!href.includes("gitlab.com") &&
			!href.includes("docs.rs") &&
			!href.includes("crates.io")
		) {
			homepage = href;
		}
	}

	// ── Authors / Owners ──────────────────────────────────────────────────
	// Owner links use stable URL patterns: /users/<name> and /teams/<team>
	let author: string | null = null;
	const ownerAnchors = selectAll('a[href^="/users/"], a[href^="/teams/"]', doc) as unknown as Element[];
	if (ownerAnchors.length > 0) {
		const names = ownerAnchors
			.map((a) => textContent(a).trim())
			.filter(Boolean);
		if (names.length > 0) author = names.join(", ");
	}

	// ── Keywords ──────────────────────────────────────────────────────────
	// Keyword links use stable URL path: /keywords/<keyword>
	const kwAnchors = selectAll('a[href^="/keywords/"]', doc) as unknown as Element[];
	const keywords = [
		...new Set(
			kwAnchors
				.map((a) => {
					const href = getAttributeValue(a, "href") ?? "";
					// Extract keyword from URL path: /keywords/no_std → no_std
					return href.split("/keywords/")[1]?.split("/")[0] ?? "";
				})
				.filter(Boolean),
		),
	];

	// ── Validation ────────────────────────────────────────────────────────
	const effectiveName = name ?? nameFromUrl;
	if (!effectiveName) {
		throw new Error("No crates.io package content found");
	}

	const titleStr = version ? `${effectiveName} ${version}` : effectiveName;

	return {
		type: "package",
		title: titleStr || pageTitle,
		url,
		registry: "crates",
		name: effectiveName,
		version,
		description,
		author,
		license,
		keywords,
		repository,
		homepage,
		installCommand: `cargo add ${effectiveName}`,
	};
}
