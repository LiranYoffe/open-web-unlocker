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

function normalizeName(name: string | null): string | null {
	return name?.replace(/\s+/g, "").trim() || null;
}

export function parseNuget(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/packages") {
		const query = parsedUrl.searchParams.get("q");
		const items = selectAll("li.package", doc) as unknown as Element[];
		const results = items.map((item, index) => {
			const link = selectOne("h2.package-title a.package-title[href]", item) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			const ownerLinks = (selectAll(".package-by a", item) as unknown as Element[])
				.map((owner) => textContent(owner).replace(/\s+/g, " ").trim())
				.filter(Boolean);
			const versionText = getText(".package-list .package-version, .package-list .package-badge, .package-header + ul .package-version", item);
			const metadataText = textContent(item).replace(/\s+/g, " ").trim();
			const downloads = metadataText.match(/([\d,]+)\s+total downloads/i)?.[1] ?? null;
			const latestVersion = metadataText.match(/Latest version:\s*([^\s]+)/i)?.[1] ?? null;
			const updated = selectOne("span[data-datetime]", item) as Element | null;
			const snippet = getText(".package-details", item) ?? null;
			return {
				position: index + 1,
				title: normalizeName(textContent(link)) ?? getText("h2.package-title", item),
				url: new URL(href, "https://www.nuget.org").toString(),
				snippet,
				author: ownerLinks.join(", ") || null,
				version: latestVersion ?? versionText,
				downloads,
					publishedDate: updated ? ((getAttributeValue(updated, "data-datetime") ?? textContent(updated).trim()) || null) : null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "nuget",
			query,
			results,
		};
	}

	const name =
		normalizeName(getText(".package-title .title, h1 .title", doc)) ??
		parsedUrl.pathname.match(/^\/packages\/([^/]+)/)?.[1] ??
		null;
	if (!name) {
		throw new Error("No NuGet package content found");
	}

	const version = getText(".version-title", doc);
	const description =
		getMeta(doc, "description") ??
		getMeta(doc, "og:description", "property") ??
		getText("#readme-container p, .package-description", doc);
	const owners = (selectAll(".owner-list a.username", doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const author = [...new Set(owners)].join(", ") || null;
	const licenseLink = selectOne('a[aria-label^="License "], a[href*="licenses.nuget.org"]', doc) as Element | null;
	const license = licenseLink ? textContent(licenseLink).replace(/\s+/g, " ").trim().replace(/\s+license$/i, "") : null;
	const repositoryLink = selectOne('a[data-track="outbound-repository-url"]', doc) as Element | null;
	const repository = repositoryLink ? (getAttributeValue(repositoryLink, "href") ?? null) : null;
	const homepageLink = selectOne('a[data-track="outbound-project-url"]', doc) as Element | null;
	const homepage = homepageLink ? (getAttributeValue(homepageLink, "href") ?? null) : null;
	const tagLinks = (selectAll('a[href^="/packages?q=Tags%3A"], a[href^="/packages?q=Tag%3A"]', doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const installCommand = getText("#package-manager-0001-text .install-command-row, #dotnet-cli-0001-text .install-command-row", doc);

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "nuget",
		name,
		version,
		description,
		author,
		license,
		keywords: [...new Set(tagLinks)],
		repository,
		homepage,
		installCommand,
	};
}
