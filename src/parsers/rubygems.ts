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

/**
 * Extract the gem name from the URL path.
 * Handles: /gems/<name> and /gems/<name>/versions/<version>
 */
function gemNameFromUrl(url: string): string {
	const pathname = new URL(url).pathname;
	const stripped = pathname.replace(/^\/gems\//, "");
	return stripped.split("/")[0] ?? "";
}

/**
 * Extract the gem version from the URL path if present.
 * /gems/<name>/versions/<version> → <version>; /gems/<name> → null
 */
function gemVersionFromUrl(url: string): string | null {
	const pathname = new URL(url).pathname;
	const m = pathname.match(/\/versions\/([^/]+)/);
	return m?.[1] ?? null;
}

export function parseRubyGems(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const parsedUrl = new URL(url);
	if (parsedUrl.pathname === "/search") {
		const query = parsedUrl.searchParams.get("query");
		const cards = selectAll("a.gems__gem[href^='/gems/']", doc) as unknown as Element[];
		const results = cards.map((card, index) => {
			const href = getAttributeValue(card, "href");
			if (!href) return null;
			return {
				position: index + 1,
				title: getText(".gems__gem__name", card)?.replace(/\s+\S+$/, "") ?? textContent(card).replace(/\s+/g, " ").trim(),
				url: new URL(href, "https://rubygems.org").toString(),
				snippet: getText(".gems__gem__desc", card),
				version: getText(".gems__gem__version", card),
				downloads: getText(".gems__gem__downloads__count", card)?.replace(/Downloads/i, "").replace(/\s+/g, " ").trim() ?? null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: pageTitle,
			url,
			engine: "rubygems",
			query,
			results,
		};
	}

	const nameFromUrl = gemNameFromUrl(url);
	const versionFromUrl = gemVersionFromUrl(url);

	// ── Name ──────────────────────────────────────────────────────────────
	// The page heading anchor contains just the gem name.
	// e.g. <h1 class="t-display page__heading">
	//        <a class="t-link--black" href="/gems/rails">rails</a>
	//        <i class="page__subheading">8.1.2</i>
	//      </h1>
	let name: string | null = getText("h1.page__heading a", doc);
	// Strip version if it leaked into the anchor text
	if (name) name = name.split(/\s+/)[0] ?? null;
	name = name ?? nameFromUrl ?? null;

	// ── Version ───────────────────────────────────────────────────────────
	// <i class="page__subheading"> inside the h1 contains just the version number.
	let version: string | null =
		getText("h1.page__heading i.page__subheading", doc) ?? versionFromUrl;

	// ── Description ───────────────────────────────────────────────────────
	// rubygems.org renders the gem description in div.gem__desc (or div#markup.gem__desc).
	const description: string | null =
		getText("div#markup.gem__desc", doc) ?? getText("div.gem__desc", doc);

	// ── Repository & Homepage ─────────────────────────────────────────────
	// Sidebar links have id attributes: id="code" (source), id="home" (homepage),
	// id="docs" (documentation), id="wiki" (wiki), id="mail" (mailing list).
	let repository: string | null = null;
	let homepage: string | null = null;

	const linkEl = (id: string): string | null => {
		const el = selectOne(`a.gem__link#${id}`, doc) as Element | null;
		return el ? (getAttributeValue(el, "href") ?? null) : null;
	};
	repository = linkEl("code") ?? linkEl("source");
	homepage = linkEl("home") ?? linkEl("docs");

	// Fallback: any anchor with rel="noopener" pointing to github/gitlab
	if (!repository) {
		const anchors = selectAll('a[rel="noopener"]', doc) as unknown as Element[];
		for (const a of anchors) {
			const href = getAttributeValue(a, "href") ?? "";
			if (/github\.com|gitlab\.com/.test(href)) {
				repository = href;
				break;
			}
		}
	}

	// ── Authors / Owners ──────────────────────────────────────────────────
	// Owners displayed as avatar links with title=name in div.gem__users.
	let author: string | null = null;
	const ownerEls = selectAll("div.gem__users a[title]", doc) as unknown as Element[];
	if (ownerEls.length > 0) {
		const names = ownerEls
			.map((a) => getAttributeValue(a, "title") ?? "")
			.filter(Boolean);
		if (names.length > 0) author = names.join(", ");
	}

	// Fallback: author names inside the gem members section
	if (!author) {
		const memberEls = selectAll(".gem__members li a", doc) as unknown as Element[];
		if (memberEls.length > 0) {
			const names = memberEls.map((a) => textContent(a).trim()).filter(Boolean);
			if (names.length > 0) author = names.join(", ");
		}
	}

	// ── License ───────────────────────────────────────────────────────────
	// License label is in a <p class="gem__ruby-version"> sibling of an <h2>
	// whose text contains "License". Walk labeled sections to find it.
	let license: string | null = null;

	// rubygems.org uses p.gem__ruby-version (reused class) for multiple metadata rows.
	// Look for the one preceded by an h2/p that says "License".
	// Strategy: find all labeled info rows from .gem__ruby-version
	const metaRows = selectAll(".gem__ruby-version", doc) as unknown as Element[];
	for (const row of metaRows) {
		const parent = row.parent as Element | null;
		if (!parent) continue;
		const parentText = textContent(parent).toLowerCase();
		if (parentText.includes("license")) {
			const val = textContent(row).trim();
			if (val && val.toLowerCase() !== "license") {
				license = val;
				break;
			}
		}
	}

	// ── Validation ────────────────────────────────────────────────────────
	const effectiveName = name ?? nameFromUrl;
	if (!effectiveName) {
		throw new Error("No RubyGems package content found");
	}

	const titleStr = version ? `${effectiveName} ${version}` : effectiveName;

	return {
		type: "package",
		title: titleStr || pageTitle,
		url,
		registry: "rubygems",
		name: effectiveName,
		version,
		description,
		author,
		license,
		keywords: [],
		repository,
		homepage,
		installCommand: `gem install ${effectiveName}`,
	};
}
