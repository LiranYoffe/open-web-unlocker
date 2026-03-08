import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { AppData } from "./page-data";

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
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
 * Apple App Store pages embed a rich JSON data blob in an inline <script> tag.
 * This contains version info, screenshots, "what's new", size, etc.
 */
function extractInlineData(doc: Document): Record<string, unknown> | null {
	const scripts = selectAll("script", doc) as unknown as Element[];
	for (const script of scripts) {
		const raw = textContent(script);
		if (!raw.includes('"shelfMapping"') || !raw.includes('"mostRecentVersion"')) continue;
		try {
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			const dataArr = parsed.data as unknown[] | undefined;
			if (!Array.isArray(dataArr) || dataArr.length === 0) continue;
			const first = dataArr[0] as Record<string, unknown>;
			const innerData = first.data as Record<string, unknown> | undefined;
			if (innerData?.shelfMapping) return innerData;
		} catch {
			// Ignore parse errors
		}
	}
	return null;
}

/** Look up a value from the information shelf items by title (e.g. "Size", "Category") */
function getInformationField(
	shelfMapping: Record<string, unknown>,
	fieldTitle: string,
): string | null {
	const info = shelfMapping.information as Record<string, unknown> | undefined;
	if (!info) return null;
	const items = info.items as Record<string, unknown>[] | undefined;
	if (!Array.isArray(items)) return null;
	for (const item of items) {
		if (item.title === fieldTitle) {
			const subItems = item.items as Record<string, unknown>[] | undefined;
			if (Array.isArray(subItems) && subItems.length > 0) {
				const text = subItems[0]?.text;
				return typeof text === "string" && text.trim() ? text.trim() : null;
			}
		}
	}
	return null;
}

/** Extract screenshot URLs from the product_media_phone_ shelf */
function extractScreenshotUrls(shelfMapping: Record<string, unknown>): string[] {
	const media = shelfMapping.product_media_phone_ as Record<string, unknown> | undefined;
	if (!media) return [];
	const items = media.items as Record<string, unknown>[] | undefined;
	if (!Array.isArray(items)) return [];

	const urls: string[] = [];
	for (const item of items) {
		const screenshot = item.screenshot as Record<string, unknown> | undefined;
		if (!screenshot) continue;
		const template = screenshot.template as string | undefined;
		if (typeof template === "string" && template.includes("mzstatic.com")) {
			// Replace placeholders with reasonable defaults for a usable URL
			const url = template
				.replace("{w}", "460")
				.replace("{h}", "0")
				.replace("{c}", "bb")
				.replace("{f}", "png");
			urls.push(url);
		}
	}
	return urls;
}

export function parseAppStore(html: string, url: string): AppData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	let name: string | null = null;
	let developer: string | null = null;
	let price: string | null = null;
	let rating: string | null = null;
	let ratingCount: string | null = null;
	let description: string | null = null;
	let category: string | null = null;
	let version: string | null = null;
	let size: string | null = null;
	let compatibility: string | null = null;
	let releaseDate: string | null = null;
	let whatsNew: string | null = null;
	let screenshotUrls: string[] = [];

	// ── JSON-LD SoftwareApplication (primary source) ─────────────────────
	const jsonLdItems = extractJsonLd(doc);
	const app = findByType(jsonLdItems, "SoftwareApplication");

	if (app) {
		name = stringVal(app.name);
		description = stringVal(app.description);
		category = stringVal(app.applicationCategory);
		compatibility = stringVal(app.operatingSystem);

		// Offers (price)
		const offers = app.offers as Record<string, unknown> | undefined;
		if (offers) {
			const priceVal = offers.price;
			const currency = stringVal(offers.priceCurrency) ?? "USD";
			if (priceVal === 0 || priceVal === "0") {
				price = "Free";
			} else if (typeof priceVal === "number") {
				price = `${currency} ${priceVal}`;
			} else if (typeof priceVal === "string" && priceVal.trim()) {
				price = priceVal.trim() === "0" ? "Free" : `${currency} ${priceVal.trim()}`;
			}
		}

		// Aggregate rating
		const aggRating = app.aggregateRating as Record<string, unknown> | undefined;
		if (aggRating) {
			const ratingVal = aggRating.ratingValue;
			if (typeof ratingVal === "number") rating = String(ratingVal);
			else if (typeof ratingVal === "string") rating = ratingVal;

			const countVal = aggRating.reviewCount ?? aggRating.ratingCount;
			if (typeof countVal === "number") ratingCount = countVal.toLocaleString();
			else if (typeof countVal === "string") ratingCount = countVal;
		}

		// Author / developer
		const authorObj = app.author as Record<string, unknown> | undefined;
		if (authorObj) {
			developer = stringVal(authorObj.name);
		}
	}

	// ── Inline JSON data (version, size, what's new, screenshots) ────────
	const inlineData = extractInlineData(doc);
	if (inlineData) {
		const sm = inlineData.shelfMapping as Record<string, unknown>;

		// Developer from top-level data if not from JSON-LD
		if (!developer) {
			const devAction = inlineData.developerAction as Record<string, unknown> | undefined;
			if (devAction) {
				developer = stringVal(devAction.title);
			}
		}

		// Name from top-level data if not from JSON-LD
		if (!name) {
			name = stringVal(inlineData.title);
		}

		// Most recent version (version, what's new, release date)
		const mrv = sm.mostRecentVersion as Record<string, unknown> | undefined;
		if (mrv) {
			const mrvItems = mrv.items as Record<string, unknown>[] | undefined;
			if (Array.isArray(mrvItems) && mrvItems.length > 0) {
				const first = mrvItems[0];
				if (first) {
					whatsNew = stringVal(first.text);
					const versionStr = stringVal(first.primarySubtitle);
					if (versionStr) {
						version = versionStr.replace(/^Version\s+/i, "");
					}
					const dateStr = stringVal(first.secondarySubtitle);
					if (dateStr) {
						try {
							const d = new Date(dateStr);
							if (!Number.isNaN(d.getTime())) {
								releaseDate = d.toISOString().split("T")[0] ?? null;
							}
						} catch {
							releaseDate = dateStr;
						}
					}
				}
			}
		}

		// Information shelf (size, category, compatibility)
		if (!size) size = getInformationField(sm, "Size");
		if (!category) category = getInformationField(sm, "Category");

		const compatField = getInformationField(sm, "Compatibility");
		if (compatField && !compatibility) {
			compatibility = compatField;
		}

		// Screenshots
		screenshotUrls = extractScreenshotUrls(sm);
	}

	// ── og:* meta tag fallbacks ──────────────────────────────────────────
	if (!name) {
		const ogTitle = getMeta(doc, "og:title", "property");
		if (ogTitle) {
			// Strip " App - App Store" suffix
			name = ogTitle.replace(/\s+App\s*-\s*App Store$/i, "").trim() || ogTitle;
		}
	}

	if (!description) {
		description = getMeta(doc, "og:description", "property") ?? getMeta(doc, "description");
	}

	if (!name) {
		throw new Error("No App Store content found");
	}

	return {
		type: "app",
		title: name || pageTitle,
		url,
		platform: "appstore",
		name,
		developer,
		price,
		rating,
		ratingCount,
		description,
		category,
		version,
		size,
		compatibility,
		releaseDate,
		whatsNew,
		screenshotUrls,
	};
}
