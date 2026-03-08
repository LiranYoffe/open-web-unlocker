/**
 * yahoo-finance.ts — Parser for Yahoo Finance stock quote pages.
 *
 * URL patterns handled:
 *   /quote/<SYMBOL>       — stock/ETF/crypto/index quote page
 *   /quote/<SYMBOL>/      — same with trailing slash
 *
 * Yahoo Finance is a SvelteKit app. No JSON-LD is present.
 * All data is extracted from DOM using stable data-testid attributes:
 *   - quote-hdr, quote-title, quote-price, price-statistic
 *   - company-overview-card
 *   - neo-key-statistics, valuation-measures, financial-highlights
 *   - analyst-price-target-card, analyst-recommendations-card
 *   - recent-news with storyitem containers
 *
 * Key-value stats (Previous Close, Market Cap, etc.) are in label/value
 * pairs inside list items.
 *
 * NOTE: Yahoo Finance requires cookie consent (GUCE) — browser strategy
 * with consent acceptance is needed. Fetch-only strategies hit the consent wall.
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue } from "domutils";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { SearchResult, SearchResultsData, StockQuoteData, StockQuoteStats } from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSection(
	doc: Document,
	testid: string,
): Element | null {
	return selectOne(
		`[data-testid="${testid}"]`,
		doc,
	) as Element | null;
}

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

// ── Symbol extraction ────────────────────────────────────────────────────────

function extractSymbol(url: string): string | null {
	try {
		const pathname = new URL(url).pathname;
		// /quote/AAPL or /quote/AAPL/
		const match = pathname.match(/\/quote\/([^/]+)/);
		return match?.[1]?.toUpperCase() ?? null;
	} catch {
		return null;
	}
}

function extractLookupQuery(url: string): string | null {
	try {
		return new URL(url).searchParams.get("s")?.trim() ?? null;
	} catch {
		return null;
	}
}

// ── Price extraction ─────────────────────────────────────────────────────────

interface PriceInfo {
	price: string | null;
	change: string | null;
	changePercent: string | null;
	afterHoursPrice: string | null;
	afterHoursChange: string | null;
}

function extractPrice(doc: Document): PriceInfo {
	const result: PriceInfo = {
		price: null,
		change: null,
		changePercent: null,
		afterHoursPrice: null,
		afterHoursChange: null,
	};

	// There are two price-statistic sections: close and after-hours
	const priceStats = selectAll(
		'[data-testid="price-statistic"]',
		doc,
	) as unknown as Element[];

	for (const stat of priceStats) {
		const text = textContent(stat).trim();

		if (text.includes("At close") || text.includes("As of")) {
			// Close price: "264.18 -8.77 (-3.21%)  At close: ..."
			const priceMatch = text.match(/^([\d,.]+)\s+([-+]?[\d,.]+)\s+\(([-+]?[\d,.]+%)\)/);
			if (priceMatch) {
				result.price = priceMatch[1] ?? null;
				result.change = priceMatch[2] ?? null;
				result.changePercent = priceMatch[3] ?? null;
			}
		} else if (text.includes("After hours") || text.includes("Pre-Market")) {
			// After hours: "263.55 -0.63 (-0.24%) After hours: ..."
			const ahMatch = text.match(/^([\d,.]+)\s+([-+]?[\d,.]+)\s+\(([-+]?[\d,.]+%)\)/);
			if (ahMatch) {
				result.afterHoursPrice = ahMatch[1] ?? null;
				result.afterHoursChange = `${ahMatch[2]} (${ahMatch[3]})`;
			}
		}
	}

	// Fallback: try the quote-price section
	if (!result.price) {
		const quotePrice = getSection(doc, "quote-price");
		if (quotePrice) {
			const text = textContent(quotePrice).trim();
			const priceMatch = text.match(/^([\d,.]+)\s+([-+]?[\d,.]+)\s+\(([-+]?[\d,.]+%)\)/);
			if (priceMatch) {
				result.price = priceMatch[1] ?? null;
				result.change = priceMatch[2] ?? null;
				result.changePercent = priceMatch[3] ?? null;
			}
		}
	}

	return result;
}

// ── Key stats extraction ─────────────────────────────────────────────────────

/**
 * Extract label-value pairs from list items.
 * Yahoo Finance renders stats as <li> items with a label span and value span.
 */
function extractLabelValuePairs(doc: Document): Map<string, string> {
	const pairs = new Map<string, string>();

	// Stats are in <li> elements containing two children (label + value)
	const listItems = selectAll("li", doc) as unknown as Element[];
	for (const li of listItems) {
		const spans = selectAll("span", li) as unknown as Element[];
		if (spans.length >= 2) {
			const label = textContent(spans[0] as Element).trim();
			const value = textContent(spans[spans.length - 1] as Element).trim();
			if (label && value && label !== value) {
				pairs.set(label, value);
			}
		}
	}

	return pairs;
}

function extractStats(doc: Document): StockQuoteStats {
	const pairs = extractLabelValuePairs(doc);

	return {
		previousClose: pairs.get("Previous Close") ?? null,
		open: pairs.get("Open") ?? null,
		bid: pairs.get("Bid") ?? null,
		ask: pairs.get("Ask") ?? null,
		dayRange: pairs.get("Day's Range") ?? null,
		yearRange: pairs.get("52 Week Range") ?? null,
		volume: pairs.get("Volume") ?? null,
		avgVolume: pairs.get("Avg. Volume") ?? null,
		marketCap: pairs.get("Market Cap (intraday)") ?? pairs.get("Market Cap") ?? pairs.get("Net Assets") ?? null,
		beta: pairs.get("Beta (5Y Monthly)") ?? null,
		peRatio: pairs.get("PE Ratio (TTM)") ?? null,
		eps: pairs.get("EPS (TTM)") ?? null,
		earningsDate: pairs.get("Earnings Date") ?? null,
		forwardDividend: pairs.get("Forward Dividend & Yield") ?? null,
		exDividendDate: pairs.get("Ex-Dividend Date") ?? null,
		oneYearTarget: pairs.get("1y Target Est") ?? null,
	};
}

// ── Company overview extraction ──────────────────────────────────────────────

interface CompanyOverview {
	description: string | null;
	sector: string | null;
	industry: string | null;
}

function extractCompanyOverview(doc: Document): CompanyOverview {
	const result: CompanyOverview = {
		description: null,
		sector: null,
		industry: null,
	};

	const card = getSection(doc, "company-overview-card");
	if (!card) return result;

	const cardText = textContent(card).trim();

	// Extract sector/industry from heading: "Consumer Electronics / Technology"
	const h2 = selectOne("h2", card) as Element | null;
	if (h2) {
		const headingText = textContent(h2).trim();
		// Format: "Company Name Overview Sector / Industry"
		const parts = headingText.split(/\s+\/\s+/);
		if (parts.length === 2) {
			// First part ends with sector, second is industry
			result.industry = parts[1]?.trim() ?? null;
			// Extract sector from first part (after "Overview")
			const sectorMatch = parts[0]?.match(/Overview\s+(.+)/);
			if (sectorMatch) {
				result.sector = sectorMatch[1]?.trim() ?? null;
			}
		}
	}

	// Extract description — it's the main paragraph text after the heading
	// Look for substantial text that isn't the heading
	const paragraphs = selectAll("p", card) as unknown as Element[];
	for (const p of paragraphs) {
		const text = textContent(p).trim();
		if (text.length > 50) {
			result.description = text;
			break;
		}
	}

	// Fallback: look for description in the card text after stripping heading
	if (!result.description) {
		const h2Text = h2 ? textContent(h2).trim() : "";
		const afterHeading = cardText.replace(h2Text, "").trim();
		// Get the first substantial sentence
		if (afterHeading.length > 50) {
			// Take text up to "Full Time Employees" or "Fiscal Year" as that's metadata
			const cutoff = afterHeading.search(/Full Time Employees|Fiscal Year|Sector|Industry/);
			if (cutoff > 50) {
				result.description = afterHeading.slice(0, cutoff).trim();
			} else if (cutoff < 0) {
				result.description = afterHeading;
			}
		}
	}

	return result;
}

// ── Quote header extraction ──────────────────────────────────────────────────

function extractExchange(doc: Document): string | null {
	const hdr = getSection(doc, "quote-hdr");
	if (!hdr) return null;
	const text = textContent(hdr).trim();
	// Format: "NasdaqGS - Nasdaq Real Time Price • USD  Apple Inc. (AAPL)"
	const match = text.match(/^(\S+)\s+-\s+/);
	return match?.[1] ?? null;
}

function extractCurrency(doc: Document): string | null {
	const hdr = getSection(doc, "quote-hdr");
	if (!hdr) return null;
	const text = textContent(hdr).trim();
	// "... Real Time Price • USD ..."
	const match = text.match(/[•·]\s+([A-Z]{3})\s/);
	return match?.[1] ?? null;
}

function extractCompanyName(doc: Document): string | null {
	const titleSection = getSection(doc, "quote-title");
	if (!titleSection) return null;
	const text = textContent(titleSection).trim();
	// "Apple Inc. (AAPL)" → "Apple Inc."
	const match = text.match(/^(.+?)\s*\(/);
	return match?.[1]?.trim() ?? text;
}

// ── Analyst targets extraction ───────────────────────────────────────────────

interface AnalystTargets {
	low: string | null;
	avg: string | null;
	high: string | null;
}

function extractAnalystTargets(doc: Document): AnalystTargets {
	const card = getSection(doc, "analyst-price-target-card");
	if (!card) return { low: null, avg: null, high: null };

	const text = textContent(card).trim();
	// "Analyst Price Targets  205.00 Low 293.07 Average  264.18 Current  350.00 High"
	const lowMatch = text.match(/([\d,.]+)\s+Low/);
	const avgMatch = text.match(/([\d,.]+)\s+Average/);
	const highMatch = text.match(/([\d,.]+)\s+High/);

	return {
		low: lowMatch?.[1] ?? null,
		avg: avgMatch?.[1] ?? null,
		high: highMatch?.[1] ?? null,
	};
}

// ── Consent wall detection ───────────────────────────────────────────────────

function isConsentWall(doc: Document): boolean {
	const title = extractTitle(doc);
	if (!title) return false;
	return /privacy|consent|guce/i.test(title) || /הפרטיות/i.test(title);
}

function toAbsoluteUrl(href: string | null, pageUrl: string): string | null {
	if (!href) return null;
	try {
		return new URL(href, pageUrl).toString();
	} catch {
		return href;
	}
}

function parseYahooLookup(doc: Document, url: string): SearchResultsData {
	const rows = selectAll("table tbody tr", doc) as unknown as Element[];
	const results: SearchResult[] = [];

	for (const [index, row] of rows.entries()) {
		const cells = selectAll("td", row) as unknown as Element[];
		if (cells.length < 6) continue;

		const symbolLink = selectOne('a[href*="/quote/"]', row) as Element | null;
		const symbol = symbolLink ? textContent(symbolLink).trim() || null : null;
		const href = symbolLink ? getAttributeValue(symbolLink, "href") ?? null : null;
		const absoluteUrl = toAbsoluteUrl(href, url);
		if (!symbol || !absoluteUrl) continue;

		const name = textContent(cells[1] as Element).replace(/\s+/g, " ").trim() || null;
		const lastPrice = textContent(cells[2] as Element).replace(/\s+/g, " ").trim() || null;
		const category = textContent(cells[3] as Element).replace(/\s+/g, " ").trim() || null;
		const resultType = textContent(cells[4] as Element).replace(/\s+/g, " ").trim() || null;
		const exchange = textContent(cells[5] as Element).replace(/\s+/g, " ").trim() || null;

		const snippetParts = [name, category, resultType, exchange]
			.filter((part) => part && part !== "--");
		results.push({
			position: index + 1,
			title: name && name !== "--" ? `${symbol} — ${name}` : symbol,
			url: absoluteUrl,
			snippet: snippetParts.length > 0 ? snippetParts.join(" · ") : null,
			price: lastPrice && lastPrice !== "--" ? lastPrice : null,
			category: category && category !== "--" ? category : null,
			resultType: resultType && resultType !== "--" ? resultType : null,
			exchange: exchange && exchange !== "--" ? exchange : null,
		});
	}

	if (results.length === 0) {
		throw new Error("No Yahoo Finance lookup results found");
	}

	return {
		type: "search-results",
		title: "Yahoo Finance symbol lookup",
		url,
		engine: "yahoo-finance",
		query: extractLookupQuery(url),
		results,
	};
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseYahooFinance(
	html: string,
	url: string,
): StockQuoteData | SearchResultsData {
	const doc = parseDocument(html);

	// Detect consent wall
	if (isConsentWall(doc)) {
		throw new Error("Yahoo Finance consent wall — browser strategy with consent handling needed");
	}

	const pathname = new URL(url).pathname;
	if (pathname.startsWith("/lookup")) {
		return parseYahooLookup(doc, url);
	}

	const symbol = extractSymbol(url);
	if (!symbol) {
		throw new Error("Cannot extract symbol from Yahoo Finance URL");
	}

	const pageTitle = extractTitle(doc);
	const companyName = extractCompanyName(doc);
	const exchange = extractExchange(doc);
	const currency = extractCurrency(doc);
	const priceInfo = extractPrice(doc);
	const stats = extractStats(doc);
	const overview = extractCompanyOverview(doc);
	const targets = extractAnalystTargets(doc);

	// Must have at least price or company name
	if (!priceInfo.price && !companyName) {
		throw new Error("No Yahoo Finance quote data found");
	}

	// Build title
	const title = companyName
		? `${companyName} (${symbol})`
		: pageTitle;

	return {
		type: "stock-quote",
		title,
		url,
		symbol,
		companyName,
		exchange,
		currency,
		price: priceInfo.price,
		priceChange: priceInfo.change,
		priceChangePercent: priceInfo.changePercent,
		afterHoursPrice: priceInfo.afterHoursPrice,
		afterHoursChange: priceInfo.afterHoursChange,
		sector: overview.sector,
		industry: overview.industry,
		description: overview.description,
		stats,
		analystTargetLow: targets.low,
		analystTargetAvg: targets.avg,
		analystTargetHigh: targets.high,
	};
}
