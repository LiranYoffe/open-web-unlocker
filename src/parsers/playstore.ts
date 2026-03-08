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
 * Extract the AF_initDataCallback ds:5 blob which contains the main app data.
 * This includes description, download count, version, developer, screenshots, etc.
 */
function extractDs5Data(html: string): unknown[] | null {
	const match = html.match(/AF_initDataCallback\(\{key:\s*'ds:5'[^}]*data:([\s\S]*?)\}\);/);
	if (!match?.[1]) return null;
	try {
		const parsed = JSON.parse(match[1]) as unknown[];
		return parsed;
	} catch {
		return null;
	}
}

/**
 * Safely traverse a nested array structure by indices.
 * Google Play Store stores structured data in deeply nested arrays.
 */
function dig(data: unknown, ...path: number[]): unknown {
	let current: unknown = data;
	for (const idx of path) {
		if (!Array.isArray(current) || idx >= current.length) return undefined;
		current = current[idx];
	}
	return current;
}

function digStr(data: unknown, ...path: number[]): string | null {
	const val = dig(data, ...path);
	return typeof val === "string" && val.trim() ? val.trim() : null;
}

/** Extract screenshot URLs from DOM (img elements with data-screenshot-index) */
function extractScreenshotUrls(doc: Document): string[] {
	const imgs = selectAll("img[data-screenshot-index]", doc) as unknown as Element[];
	const urls: string[] = [];
	for (const img of imgs) {
		const src = getAttributeValue(img, "src");
		if (src && src.includes("googleusercontent.com")) {
			urls.push(src);
		}
	}
	return urls;
}

/** Extract "What's New" text from the dedicated section */
function extractWhatsNew(doc: Document): string | null {
	// The "What's new" section has an h2 with that text, followed by div[itemprop="description"]
	const headers = selectAll("h2", doc) as unknown as Element[];
	for (const h2 of headers) {
		const text = textContent(h2).trim();
		if (/what.s new/i.test(text)) {
			// The parent section should contain the description
			const parent = h2.parentNode?.parentNode?.parentNode;
			if (parent) {
				const descEl = selectOne('[itemprop="description"]', parent as Element) as Element | null;
				if (descEl) {
					return textContent(descEl).trim() || null;
				}
			}
		}
	}
	return null;
}

/** Extract the "Updated on" date from DOM */
function extractUpdatedDate(doc: Document): string | null {
	// Pattern: <div>Updated on</div><div class="xg1aie">Feb 21, 2026</div>
	// We find elements containing "Updated on" text and grab the next sibling text
	const allDivs = selectAll("div", doc) as unknown as Element[];
	for (const div of allDivs) {
		const text = textContent(div).trim();
		if (text === "Updated on") {
			// The next sibling div should contain the date
			const parent = div.parentNode;
			if (parent) {
				const siblings = selectAll("div", parent as Element) as unknown as Element[];
				for (const sib of siblings) {
					if (sib === div) continue;
					const dateText = textContent(sib).trim();
					if (dateText && /\w+\s+\d{1,2},?\s+\d{4}/.test(dateText)) {
						return dateText;
					}
				}
			}
		}
	}
	return null;
}

/** Extract the long description from the "About this app" section */
function extractAboutDescription(doc: Document): string | null {
	const headers = selectAll("h2", doc) as unknown as Element[];
	for (const h2 of headers) {
		const text = textContent(h2).trim();
		if (/about this app/i.test(text)) {
			// Look for itemprop="description" in the closest ancestor section
			const parent = h2.parentNode?.parentNode?.parentNode;
			if (parent) {
				const descEl = selectOne('[itemprop="description"]', parent as Element) as Element | null;
				if (descEl) {
					return textContent(descEl).trim() || null;
				}
			}
		}
	}
	return null;
}

export function parsePlayStore(html: string, url: string): AppData {
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

		// Offers (price) — Google Play uses an array of Offer objects
		const offersRaw = app.offers;
		const offers = Array.isArray(offersRaw) ? (offersRaw[0] as Record<string, unknown> | undefined) : (offersRaw as Record<string, unknown> | undefined);
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
			if (typeof ratingVal === "number") rating = String(Math.round(ratingVal * 10) / 10);
			else if (typeof ratingVal === "string") {
				const parsed = Number.parseFloat(ratingVal);
				rating = Number.isNaN(parsed) ? ratingVal : String(Math.round(parsed * 10) / 10);
			}

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

	// ── Inline ds:5 data (version, size, downloads, full description) ────
	const ds5 = extractDs5Data(html);
	if (ds5) {
		// ds:5 structure: data[1][2] is the main app info array
		const appInfo = dig(ds5, 1, 2) as unknown[] | undefined;
		if (Array.isArray(appInfo)) {
			// Name: appInfo[0][0]
			if (!name) {
				name = digStr(appInfo, 0, 0);
			}

			// Developer: appInfo[37][0] or appInfo[68][0]
			if (!developer) {
				developer = digStr(appInfo, 37, 0) ?? digStr(appInfo, 68, 0);
			}

			// Download count: appInfo[13][0] (e.g. "10,000,000,000+")
			// We store this in size field since Play Store doesn't show file size
			const downloadCount = digStr(appInfo, 13, 0);

			// Full description from inline data: appInfo[72][0][1]
			const inlineDesc = digStr(appInfo, 72, 0, 1);
			if (inlineDesc && (!description || inlineDesc.length > description.length)) {
				// Strip HTML tags from inline description
				description = inlineDesc
					.replace(/<br\s*\/?>/gi, "\n")
					.replace(/<[^>]+>/g, "")
					.replace(/&gt;/g, ">")
					.replace(/&lt;/g, "<")
					.replace(/&amp;/g, "&")
					.replace(/\n{3,}/g, "\n\n")
					.trim();
			}

			// Short description (tagline): appInfo[73][0][1]
			// If description is still the short one from JSON-LD, try the inline full one
			if (!description || description.length < 50) {
				const aboutDesc = extractAboutDescription(doc);
				if (aboutDesc) description = aboutDesc;
			}

			// Store download count as size (Play Store doesn't expose file size)
			if (downloadCount) {
				size = `${downloadCount} downloads`;
			}
		}
	}

	// ── DOM-based extraction ─────────────────────────────────────────────

	// Screenshots from DOM
	screenshotUrls = extractScreenshotUrls(doc);

	// What's New from DOM
	whatsNew = extractWhatsNew(doc);

	// Updated date from DOM
	const updatedDate = extractUpdatedDate(doc);
	if (updatedDate) {
		try {
			const d = new Date(updatedDate);
			if (!Number.isNaN(d.getTime())) {
				releaseDate = d.toISOString().split("T")[0] ?? null;
			}
		} catch {
			releaseDate = updatedDate;
		}
	}

	// ── og:* meta tag fallbacks ──────────────────────────────────────────
	if (!name) {
		const ogTitle = getMeta(doc, "og:title", "property");
		if (ogTitle) {
			// Strip " - Apps on Google Play" suffix
			name = ogTitle.replace(/\s*-\s*Apps on Google Play$/i, "").trim() || ogTitle;
		}
	}

	if (!description) {
		description = getMeta(doc, "og:description", "property") ?? getMeta(doc, "description");
	}

	if (!name) {
		throw new Error("No Play Store content found");
	}

	return {
		type: "app",
		title: name || pageTitle,
		url,
		platform: "playstore",
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
