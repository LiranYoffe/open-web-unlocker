import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { ProductData, SearchResultsData } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "aside", "svg"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
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

/** Convert schema.org condition/availability URL to human text */
function schemaUrlToText(url: string): string {
	const last = url.split("/").pop() ?? url;
	return last
		.replace(/Condition$/, "")
		.replace(/([A-Z])/g, " $1")
		.trim();
}

export function parseEbay(html: string, url: string): ProductData | SearchResultsData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const parsedUrl = new URL(url);

	if (parsedUrl.pathname.startsWith("/sch/")) {
		const results = (selectAll("li.s-card", doc) as unknown as Element[])
			.map((item, index) => {
				const link = selectOne("a[href*='/itm/']", item) as Element | null;
				const href = link ? getAttributeValue(link, "href") : null;
				const titleEl = (selectOne("div.s-card__title", item) ??
					selectOne("span.s-card__title", item)) as Element | null;
				const rawTitle = titleEl ? textContent(titleEl).replace(/\s+/g, " ").trim() : "";
				const title = rawTitle.replace(/Opens in a new window or tab$/i, "").trim();
				if (!href || !title || /^Shop on eBay$/i.test(title)) return null;

				const subtitle = getText(".s-card__subtitle", item);
				const secondaryBits = (selectAll(".su-card-container__attributes__secondary .su-styled-text, .s-card__footer .su-styled-text", item) as unknown as Element[])
					.map((el) => textContent(el).replace(/\s+/g, " ").trim())
					.filter(Boolean);
				const snippet = [subtitle, ...secondaryBits].filter(Boolean).join(" · ") || null;

				return {
					position: index + 1,
					title,
					url: new URL(href, "https://www.ebay.com").toString(),
					snippet,
					price: getText(".s-card__price, .s-card__price-range", item),
				};
			})
			.filter(Boolean) as SearchResultsData["results"];

		for (let i = 0; i < results.length; i += 1) {
			results[i]!.position = i + 1;
		}

		if (results.length === 0) {
			throw new Error("No eBay search results found");
		}

		return {
			type: "search-results",
			title: pageTitle,
			url,
			engine: "ebay",
			query: parsedUrl.searchParams.get("_nkw"),
			results,
		};
	}

	let itemTitle: string | null = null;
	let price: string | null = null;
	let currency: string | null = null;
	let availability: string | null = null;
	let condition: string | null = null;
	let rating: string | null = null;
	let reviewCount: string | null = null;

	// ── JSON-LD Product (most stable source for price, condition, availability) ──
	const jsonLdItems = extractJsonLd(doc);
	const product = findByType(jsonLdItems, "Product");

	if (product) {
		itemTitle = stringVal(product.name);

		const offersRaw = product.offers;
		const offers = Array.isArray(offersRaw)
			? (offersRaw as unknown[])
			: offersRaw
				? [offersRaw]
				: [];
		for (const offer of offers) {
			const o = offer as Record<string, unknown>;
			const priceVal = o.price;
			if (priceVal !== undefined && priceVal !== null) price = String(priceVal);
			currency = stringVal(o.priceCurrency);
			const avail = stringVal(o.availability);
			if (avail) availability = schemaUrlToText(avail);
			const cond = stringVal(o.itemCondition);
			if (cond) condition = schemaUrlToText(cond);
			break;
		}

		const ratingObj = product.aggregateRating as Record<string, unknown> | undefined;
		if (ratingObj) {
			const val = ratingObj.ratingValue;
			const count = ratingObj.reviewCount ?? ratingObj.ratingCount;
			if (val !== undefined) rating = String(val);
			if (count !== undefined) reviewCount = String(count);
		}
	}

	// ── CSS fallbacks: stable semantic selectors only ─────────────────────

	if (!itemTitle) {
		itemTitle =
			getText("h1.x-item-title__mainTitle span.ux-textspans--BOLD", doc) ??
			getText("h1.x-item-title__mainTitle", doc) ??
			getMeta(doc, "og:title");
	}

	// Item specifics via itemprop attributes (stable schema.org markup)
	const specifications: { key: string; value: string }[] = [];
	const nameEls = selectAll("[itemprop='name']", doc) as unknown as Element[];
	const valueEls = selectAll("[itemprop='value']", doc) as unknown as Element[];
	if (nameEls.length > 0 && valueEls.length > 0 && nameEls.length === valueEls.length) {
		for (let i = 0; i < nameEls.length; i++) {
			const k = textContent(nameEls[i] as Element).trim();
			const v = textContent(valueEls[i] as Element).trim();
			if (k && v) specifications.push({ key: k, value: v });
		}
	}

	// Description (stable ID)
	let description: string | null = null;
	const descEl = selectOne("#desc_wrapper", doc) as Element | null;
	if (descEl) {
		const md = nhm.translate(getInnerHTML(descEl));
		const trimmed = md.replace(/\n{3,}/g, "\n\n").trim();
		if (trimmed) description = trimmed;
	}

	if (!itemTitle && !price && specifications.length === 0) {
		throw new Error("No eBay listing content found");
	}

	return {
		type: "product",
		title: itemTitle || pageTitle,
		url,
		platform: "ebay",
		name: itemTitle,
		price,
		currency,
		availability,
		condition,
		rating,
		reviewCount,
		specifications,
		description,
	};
}
