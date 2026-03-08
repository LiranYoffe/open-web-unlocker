import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { ContainerImageData, SearchResultsData } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "svg", "button"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).replace(/\s+/g, " ").trim() || null : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

function normalizeMarkdown(markdown: string): string {
	return markdown
		.replace(/^\[⁠\]\([^)]+\)/gm, "")
		.replace(/^\s*Copy\s*$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function parseNamespaceAndImage(url: string): { namespace: string | null; image: string | null } {
	const parsedUrl = new URL(url);
	const parts = parsedUrl.pathname.split("/").filter(Boolean);
	if (parts[0] === "_" && parts[1]) {
		return { namespace: "library", image: parts[1] };
	}
	if (parts[0] === "r" && parts[1] && parts[2]) {
		return { namespace: parts[1], image: parts[2] };
	}
	return { namespace: null, image: parts.at(-1) ?? null };
}

function parseSearchOrDiscovery(doc: Document, url: string, title: string | null): SearchResultsData | null {
	const parsedUrl = new URL(url);
	const path = parsedUrl.pathname;
	const cards = selectAll('[data-testid="product-card"]', doc) as unknown as Element[];
	if (!(path.startsWith("/search") || path.startsWith("/hardened-images/catalog")) || cards.length === 0) {
		return null;
	}

	const results = cards.map((card, index) => {
		const link = selectOne('a[data-testid="product-card-link"]', card) as Element | null;
		const href = link ? getAttributeValue(link, "href") : null;
		if (!link || !href) return null;

		const titleText = textContent(link).replace(/\s+/g, " ").trim();
		const publisherLink =
			(selectOne('a[href^="/u/"]', card) as Element | null) ??
			(selectOne('a[href^="/r/"] + a', card) as Element | null);
		const badge = getText('[data-testid="productBadge"]', card);
		const artifactType = getText(".product-type", card);
		const snippet = getText("p", card);
		const pullsLabel =
			getAttr('[aria-label*="pulls"]', "aria-label", card) ??
			getAttr('[aria-label*="pull"]', "aria-label", card);
		const starsLabel = getAttr('[aria-label*="stars"]', "aria-label", card);
		const updatedLabel = getAttr('[aria-label^="Updated"]', "aria-label", card);
		const official = !!selectOne('[data-testid="official-icon"]', card);
		const hardened = !!selectOne('[data-testid="hardened-icon"]', card);

		return {
			position: index + 1,
			title: titleText || href.split("/").filter(Boolean).at(-1) || "image",
			url: new URL(href, "https://hub.docker.com").toString(),
			snippet,
			resultType: [artifactType, badge, hardened ? "Hardened" : null, official ? "Official" : null]
				.filter(Boolean)
				.join(" · ") || null,
			author: publisherLink ? textContent(publisherLink).replace(/\s+/g, " ").trim() || null : null,
			downloads: pullsLabel?.replace(/\s+pulls?$/i, "").trim() ?? null,
			stars: starsLabel?.replace(/\s+stars?$/i, "").trim() ?? null,
			publishedDate: updatedLabel?.replace(/^Updated\s+/i, "").trim() ?? null,
		};
	}).filter(Boolean) as SearchResultsData["results"];

	return {
		type: "search-results",
		title,
		url,
		engine: "docker-hub",
		query: parsedUrl.searchParams.get("q"),
		results,
	};
}

export function parseDockerHub(html: string, url: string): ContainerImageData | SearchResultsData {
	const doc = parseDocument(html);
	const title = getText("title", doc);
	const searchPage = parseSearchOrDiscovery(doc, url, title);
	if (searchPage) {
		return searchPage;
	}
	const { namespace, image } = parseNamespaceAndImage(url);
	const description =
		getText('[data-testid="description"]', doc) ??
		getAttr('meta[name="description"]', "content", doc);
	const pulls = getText('svg[data-testid="DownloadIcon"] + p', doc);
	const stars = getText('svg[data-testid="StarOutlineIcon"] + span', doc);
	const categories = (selectAll('[data-testid="categories"] [data-testid="productChip"]', doc) as unknown as Element[])
		.map((chip) => textContent(chip).replace(/\s+/g, " ").trim())
		.filter(Boolean);
	const overviewEl = selectOne('[data-testid="markdownContent"]', doc) as Element | null;
	const overview = overviewEl ? normalizeMarkdown(nhm.translate(getInnerHTML(overviewEl))) || null : null;
	const sourceRepository =
		getAttr('[data-testid="markdownContent"] a[href*="github.com"]', "href", doc) ??
		null;

	if (!image && !description && !overview) {
		throw new Error("No Docker Hub image content found");
	}

	return {
		type: "container-image",
		title,
		url,
		registry: "docker-hub",
		namespace,
		image: image ?? getText("h2", doc),
		official: !!selectOne('[data-testid="official-icon"]', doc),
		description,
		pulls,
		stars,
		categories,
		overview,
		sourceRepository,
	};
}
