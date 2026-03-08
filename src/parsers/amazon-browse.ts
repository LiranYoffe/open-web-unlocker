import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type {
	BrowseDirectoryData,
	BrowseDirectoryRefinementGroup,
	BrowseDirectorySection,
	BrowseDirectorySectionItem,
} from "./page-data";

function cleanText(value: string): string {
	const withoutArtifacts = value
		.replace(/\.aok-offscreen-text\s*\{[^}]+\}/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!withoutArtifacts) return "";

	const dedupedWords = dedupeRepeatedWords(withoutArtifacts);
	return dedupedWords.replace(/^(.*?& Up)\s+& Up$/i, "$1");
}

function dedupeRepeatedWords(value: string): string {
	const words = value.split(" ").filter(Boolean);
	if (words.length >= 2 && words.length % 2 === 0) {
		const half = words.length / 2;
		const left = words.slice(0, half).join(" ");
		const right = words.slice(half).join(" ");
		if (left.toLowerCase() === right.toLowerCase()) {
			return left;
		}
	}
	return value;
}

function normalizePriceToken(token: string): string {
	return token
		.replace(/^([A-Z]{3})(\d)/, "$1 $2")
		.replace(/\s+/g, " ")
		.trim();
}

function formatShowcaseDetails(raw: string): string | null {
	const text = cleanText(raw);
	if (!text) return null;

	const parts: string[] = [];
	const seen = new Set<string>();
	const push = (value: string | null) => {
		if (!value) return;
		const cleaned = cleanText(value);
		if (!cleaned || seen.has(cleaned)) return;
		seen.add(cleaned);
		parts.push(cleaned);
	};

	push(text.match(/\d+%\s*off/i)?.[0] ?? null);
	push(text.match(/limited time deal|deal of the day/i)?.[0] ?? null);

	const labeledPrices = Array.from(
		text.matchAll(
			/(List:|Typical:)\s*((?:USD|ILS|EUR|GBP|CAD|AUD|AED|SAR|\$|£|€)\s*\d[\d.,]*)/gi,
		),
	).map((match) => `${match[1]} ${normalizePriceToken(match[2])}`);

	const priceTokens = Array.from(
		text.matchAll(/(?:USD|ILS|EUR|GBP|CAD|AUD|AED|SAR|\$|£|€)\s*\d[\d.,]*/gi),
	).map((match) => normalizePriceToken(match[0]));

	const currentPrice =
		priceTokens.find((token) => /[.,]/.test(token) && !labeledPrices.some((label) => label.endsWith(token))) ??
		priceTokens.find((token) => !labeledPrices.some((label) => label.endsWith(token))) ??
		null;

	push(currentPrice);
	for (const labeledPrice of labeledPrices) {
		push(labeledPrice);
	}

	return parts.length > 0 ? parts.join(" · ") : null;
}

function extractPageTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? cleanText(textContent(titleEl)) || null : null;
}

function resolveUrl(href: string | null, baseUrl: string): string | null {
	if (!href) return null;
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return href;
	}
}

function firstNonEmptyText(root: Element, selectors: string[]): string | null {
	for (const selector of selectors) {
		const el = selectOne(selector, root) as Element | null;
		if (!el) continue;
		const value = cleanText(textContent(el));
		if (value) return value;
	}
	return null;
}

function extractCategoryName(doc: Document, pageTitle: string | null): string | null {
	const currentEl = selectOne("#s-refinements h2", doc) as Element | null;
	if (currentEl) {
		const value = cleanText(textContent(currentEl));
		if (value) return value;
	}

	if (pageTitle) {
		const match = pageTitle.match(/:\s*(.+?)(?:\s*[-|]|$)/);
		if (match?.[1]) return cleanText(match[1]);
	}

	return null;
}

function extractRefinements(doc: Document, url: string): BrowseDirectoryRefinementGroup[] {
	const groups = selectAll(
		'#s-refinements > .a-section[role="group"]',
		doc,
	) as unknown as Element[];
	const results: BrowseDirectoryRefinementGroup[] = [];

	for (const group of groups) {
		const title = firstNonEmptyText(group, [
			"> .a-section h1",
			"> .a-section h2",
			"> .a-section .a-text-bold",
			"h1",
			"h2",
			".a-text-bold",
		]);
		if (!title) continue;

		const currentEl = selectOne("h2", group) as Element | null;
		const current = currentEl ? cleanText(textContent(currentEl)) || null : null;
		const seen = new Set<string>();
		const options = (selectAll("a.a-link-normal[href]", group) as unknown as Element[])
			.map((link) => {
				const label = cleanText(textContent(link));
				const linkUrl = resolveUrl(getAttributeValue(link, "href") ?? null, url);
				if (!label || seen.has(`${label}|${linkUrl ?? ""}`)) return null;
				seen.add(`${label}|${linkUrl ?? ""}`);
				return { label, url: linkUrl };
			})
			.filter((option): option is { label: string; url: string | null } => option !== null);

		if (!current && options.length === 0) continue;

		results.push({
			title,
			...(current ? { current } : {}),
			options,
		});
	}

	return results;
}

function splitShowcaseCardText(raw: string): {
	title: string | null;
	details: string | null;
} {
	const text = cleanText(raw);
	if (!text) return { title: null, details: null };

	const markerPatterns = [
		/\d+%\s*off/i,
		/limited time deal/i,
		/deal of the day/i,
		/list:/i,
		/typical:/i,
		/(?:USD|ILS|EUR|GBP|CAD|AUD|AED|SAR)\s*\d/i,
		/\$\s*\d/i,
		/£\s*\d/i,
		/€\s*\d/i,
	];

	let cutIndex = -1;
	for (const pattern of markerPatterns) {
		const match = pattern.exec(text);
		if (match && (cutIndex === -1 || match.index < cutIndex)) {
			cutIndex = match.index;
		}
	}

	if (cutIndex <= 0) {
		return { title: text, details: null };
	}

	const title = cleanText(text.slice(0, cutIndex));
	const details = formatShowcaseDetails(text.slice(cutIndex));
	return { title: title || null, details: details || null };
}

function makeItem(input: {
	title: string | null;
	url: string | null;
	imageUrl?: string | null;
	details?: string | null;
}): BrowseDirectorySectionItem | null {
	if (!input.title) return null;
	return {
		title: input.title,
		url: input.url,
		...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
		...(input.details ? { details: input.details } : {}),
	};
}

function extractVisualNavItems(section: Element, url: string): BrowseDirectorySectionItem[] {
	return (selectAll("li.dcl-carousel-element .a-cardui", section) as unknown as Element[])
		.map((card) => {
			const link = selectOne("a[href]", card) as Element | null;
			const image = selectOne("img", card) as Element | null;
			const title =
				firstNonEmptyText(card, [".a-cardui-footer", ".dcl-card-footer"]) ??
				(link ? getAttributeValue(link, "aria-label") ?? null : null) ??
				(image ? getAttributeValue(image, "alt") ?? null : null);
			return makeItem({
				title: title ? cleanText(title) : null,
				url: resolveUrl(link ? getAttributeValue(link, "href") ?? null : null, url),
				imageUrl: resolveUrl(image ? getAttributeValue(image, "src") ?? null : null, url),
			});
		})
		.filter((item): item is BrowseDirectorySectionItem => item !== null);
}

function extractShowcaseItems(section: Element, url: string): BrowseDirectorySectionItem[] {
	return (selectAll("li.dcl-carousel-element .a-cardui", section) as unknown as Element[])
		.map((card) => {
			const link = selectOne("a[href]", card) as Element | null;
			const image = selectOne("img", card) as Element | null;
			const rawText = cleanText(textContent(card));
			const split = splitShowcaseCardText(rawText);
			const title =
				split.title ??
				(image ? getAttributeValue(image, "alt") ?? null : null) ??
				(link ? getAttributeValue(link, "aria-label") ?? null : null);
			return makeItem({
				title,
				url: resolveUrl(link ? getAttributeValue(link, "href") ?? null : null, url),
				imageUrl: resolveUrl(image ? getAttributeValue(image, "src") ?? null : null, url),
				details: split.details,
			});
		})
		.filter((item): item is BrowseDirectorySectionItem => item !== null);
}

function extractPromoItems(section: Element, url: string): BrowseDirectorySectionItem[] {
	return (selectAll("li.sl-sobe-carousel-sub-card a[href]", section) as unknown as Element[])
		.map((link) => {
			const image = selectOne("img", link) as Element | null;
			const title =
				getAttributeValue(link, "aria-label") ??
				(image ? getAttributeValue(image, "alt") ?? null : null) ??
				null;
			return makeItem({
				title: title ? cleanText(title) : null,
				url: resolveUrl(getAttributeValue(link, "href") ?? null, url),
				imageUrl: resolveUrl(image ? getAttributeValue(image, "src") ?? null : null, url),
			});
		})
		.filter((item): item is BrowseDirectorySectionItem => item !== null);
}

function extractContentGridItems(section: Element, url: string): BrowseDirectorySectionItem[] {
	const seen = new Set<string>();
	return (selectAll("a[href]", section) as unknown as Element[])
		.map((link) => {
			const linkUrl = resolveUrl(getAttributeValue(link, "href") ?? null, url);
			if (!linkUrl || seen.has(linkUrl)) return null;
			seen.add(linkUrl);
			const image = selectOne("img", link) as Element | null;
			const rawText = cleanText(textContent(link));
			const title =
				(image ? getAttributeValue(image, "alt") ?? null : null) ??
				(rawText || null);
			return makeItem({
				title: title ? cleanText(title) : null,
				url: linkUrl,
				imageUrl: resolveUrl(image ? getAttributeValue(image, "src") ?? null : null, url),
			});
		})
		.filter((item): item is BrowseDirectorySectionItem => item !== null);
}

function detectSectionKind(section: Element): BrowseDirectorySection["kind"] {
	const className = section.attribs.class ?? "";
	if (className.includes("d-visual-nav")) return "visual-nav";
	if (className.includes("d-showcase")) return "showcase";
	if (className.includes("csm-widget-type-herotator")) return "herotator";
	if (className.includes("csm-widget-type-horizontaleditorial")) {
		return "horizontal-editorial";
	}
	return "content-grid";
}

function extractSectionTitle(section: Element): string | null {
	return firstNonEmptyText(section, [
		".dcl-header-title",
		".sl-sobe-carousel-header h2",
		"h1",
		"h2",
		"h3",
	]);
}

function extractSections(doc: Document, url: string): BrowseDirectorySection[] {
	const containers = selectAll(
		"div.dcl-container.d-page-type-browse, section.sl-sobe-card-desktop, div[data-card-metrics-id]",
		doc,
	) as unknown as Element[];
	const sections: BrowseDirectorySection[] = [];

	for (const container of containers) {
		const kind = detectSectionKind(container);
		const title = extractSectionTitle(container);
		const items =
			kind === "visual-nav"
				? extractVisualNavItems(container, url)
				: kind === "showcase"
					? extractShowcaseItems(container, url)
					: kind === "herotator" || kind === "horizontal-editorial"
						? extractPromoItems(container, url)
						: extractContentGridItems(container, url);

		if (items.length === 0) continue;
		if (!title && kind === "content-grid" && items.length <= 1) continue;

		sections.push({
			kind,
			...(title ? { title } : {}),
			items,
		});
	}

	return sections;
}

export function parseAmazonBrowse(html: string, url: string): BrowseDirectoryData {
	const doc = parseDocument(html);
	const pageTitle = extractPageTitle(doc);
	const name = extractCategoryName(doc, pageTitle);
	const refinements = extractRefinements(doc, url);
	const sections = extractSections(doc, url);

	if (!name && refinements.length === 0 && sections.length === 0) {
		throw new Error("No Amazon browse content found");
	}

	return {
		type: "browse-directory",
		title: pageTitle,
		url,
		platform: "amazon",
		name,
		refinements,
		sections,
	};
}
