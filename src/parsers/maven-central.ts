import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PackageData, SearchResultsData } from "./page-data";

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).replace(/\s+/g, " ").trim() || null : null;
}

function parsePomDescription(pomText: string | null): string | null {
	if (!pomText) return null;
	const match = pomText.match(/<description>([\s\S]*?)<\/description>/i);
	return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

export function parseMavenCentral(html: string, url: string): PackageData | SearchResultsData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname === "/search") {
		const query = parsedUrl.searchParams.get("q");
		const cards = selectAll('[data-test="component-card-item"]', doc) as unknown as Element[];
		const results = cards.map((card, index) => {
			const link = selectOne('[data-test="component-card-name-link"]', card) as Element | null;
			const href = link ? getAttributeValue(link, "href") : null;
			if (!link || !href) return null;
			return {
				position: index + 1,
				title: textContent(link).replace(/\s+/g, " ").trim(),
				url: new URL(href, "https://central.sonatype.com").toString(),
				snippet: getText('[data-test="component-card-description"]', card),
				author: getText('[data-test="component-card-namespace"]', card),
				category: getText('[data-test="category"]', card)?.replace(/^#/, "") ?? null,
			};
		}).filter(Boolean) as SearchResultsData["results"];

		return {
			type: "search-results",
			title: getText("title", doc),
			url,
			engine: "maven-central",
			query,
			results,
		};
	}

	const artifactName = getText('[data-test="header"]', doc);
	const namespace = getText('[data-test="component-namespace"]', doc);
	if (!artifactName || !namespace) {
		throw new Error("No Maven Central artifact content found");
	}

	const packageName = `${namespace}:${artifactName}`;
	const ossIndexEl = selectOne('[data-test="ossindex-metadata-link"]', doc) as Element | null;
	const ossIndexHref = ossIndexEl ? (getAttributeValue(ossIndexEl, "href") ?? "") : "";
	const version = ossIndexHref.match(/@([^/?#]+)/)?.[1] ?? null;
	const pomText = getText('[data-test="pom-file"]', doc);
	const description = parsePomDescription(pomText);
	const license = getText('[data-test="license"]', doc);
	const authorNames = (selectAll('[data-test="central-namespace-contributor-name"]', doc) as unknown as Element[])
		.map((el) => textContent(el).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const author = [...new Set(authorNames)].join(", ") || null;
	const homepageEl = selectOne('[data-test="project-url"]', doc) as Element | null;
	const repositoryEl = selectOne('[data-test="scm-url"]', doc) as Element | null;
	const homepage = homepageEl ? (getAttributeValue(homepageEl, "href") ?? null) : null;
	const repository = repositoryEl ? (getAttributeValue(repositoryEl, "href") ?? null) : homepage;
	const installCommand = version
		? `mvn dependency:get -Dartifact=${namespace}:${artifactName}:${version}`
		: `mvn dependency:get -Dartifact=${namespace}:${artifactName}`;

	return {
		type: "package",
		title: getText("title", doc),
		url,
		registry: "maven-central",
		name: packageName,
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
