/**
 * zillow.ts — Zillow real estate listing page parser.
 *
 * Strategy:
 *   1. Extract embedded data from __NEXT_DATA__ script tag (Next.js app).
 *      Path: props.pageProps.componentProps.gdpClientCache → stringified JSON
 *      containing a property object with address, price, bed/bath/sqft, etc.
 *   2. JSON-LD RealEstateListing / Product schema for address, price, floor size.
 *   3. og:title / og:description meta tags as fallback.
 *
 * Zillow pages embed rich property data in gdpClientCache (a stringified JSON
 * blob inside __NEXT_DATA__). The cache key varies but always contains a
 * "property" sub-object with the listing details.
 *
 * Selector priority: __NEXT_DATA__ (gdpClientCache) → JSON-LD → og:* meta
 * Never use: [class*=...] substring class selectors
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { PropertyData, PropertyPriceHistoryEntry } from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
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
			if (Array.isArray(parsed)) {
				results.push(...parsed);
			} else {
				results.push(parsed);
			}
		} catch {
			// Ignore malformed JSON-LD
		}
	}
	return results;
}

function stringVal(v: unknown): string | null {
	if (typeof v === "string") return v.trim() || null;
	if (typeof v === "number") return String(v);
	return null;
}

function numVal(v: unknown): number | null {
	if (typeof v === "number" && !Number.isNaN(v)) return v;
	if (typeof v === "string") {
		const n = Number(v);
		if (!Number.isNaN(n)) return n;
	}
	return null;
}

// ── Home status mapping ──────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
	FOR_SALE: "For Sale",
	PENDING: "Pending",
	SOLD: "Sold",
	FOR_RENT: "For Rent",
	RECENTLY_SOLD: "Recently Sold",
	OTHER: "Off Market",
};

// ── Home type mapping ────────────────────────────────────────────────────────

const HOME_TYPE_MAP: Record<string, string> = {
	SINGLE_FAMILY: "Single Family",
	MULTI_FAMILY: "Multi Family",
	CONDO: "Condo",
	TOWNHOUSE: "Townhouse",
	COOPERATIVE: "Co-op",
	APARTMENT: "Apartment",
	MANUFACTURED: "Manufactured",
	LOT: "Lot/Land",
	MOBILE: "Mobile Home",
};

// ── __NEXT_DATA__ extraction ─────────────────────────────────────────────────

interface ZillowProperty {
	zpid?: unknown;
	address?: Record<string, unknown>;
	streetAddress?: unknown;
	city?: unknown;
	state?: unknown;
	zipcode?: unknown;
	price?: unknown;
	zestimate?: unknown;
	rentZestimate?: unknown;
	bedrooms?: unknown;
	bathrooms?: unknown;
	livingArea?: unknown;
	livingAreaValue?: unknown;
	lotSize?: unknown;
	lotAreaValue?: unknown;
	lotAreaUnits?: unknown;
	yearBuilt?: unknown;
	homeType?: unknown;
	homeStatus?: unknown;
	description?: unknown;
	resoFacts?: Record<string, unknown>;
	taxHistory?: unknown[];
	priceHistory?: unknown[];
	attributionInfo?: Record<string, unknown>;
	listing_agent?: Record<string, unknown>;
	formattedChip?: Record<string, unknown>;
	monthlyHoaFee?: unknown;
}

function extractGdpProperty(doc: Document): ZillowProperty | null {
	const nextDataEl = selectOne('script[id="__NEXT_DATA__"]', doc) as Element | null;
	if (!nextDataEl) return null;

	try {
		const json = JSON.parse(textContent(nextDataEl)) as Record<string, unknown>;
		const props = (json.props as Record<string, unknown> | undefined) ?? {};
		const pageProps = (props.pageProps as Record<string, unknown> | undefined) ?? {};
		const componentProps = (pageProps.componentProps as Record<string, unknown> | undefined) ?? {};
		const gdpClientCache = componentProps.gdpClientCache;

		if (typeof gdpClientCache !== "string") return null;

		const cache = JSON.parse(gdpClientCache) as Record<string, unknown>;

		// Find the first cache entry that has a "property" sub-object
		for (const key of Object.keys(cache)) {
			const entry = cache[key] as Record<string, unknown> | undefined;
			if (entry?.property) {
				return entry.property as ZillowProperty;
			}
		}
	} catch {
		// Ignore parse errors
	}
	return null;
}

// ── Address formatting ───────────────────────────────────────────────────────

function formatAddress(prop: ZillowProperty): string | null {
	const addr = prop.address;
	if (addr) {
		const street = stringVal(addr.streetAddress);
		const city = stringVal(addr.city);
		const state = stringVal(addr.state);
		const zip = stringVal(addr.zipcode);
		const parts = [street, [city, state].filter(Boolean).join(", "), zip].filter(Boolean);
		if (parts.length > 0) return parts.join(", ").replace(/, ,/g, ",");
	}

	// Fallback to top-level fields
	const street = stringVal(prop.streetAddress);
	const city = stringVal(prop.city);
	const state = stringVal(prop.state);
	const zip = stringVal(prop.zipcode);
	const parts = [street, [city, state].filter(Boolean).join(", "), zip].filter(Boolean);
	return parts.length > 0 ? parts.join(", ").replace(/, ,/g, ",") : null;
}

// ── JSON-LD extraction ───────────────────────────────────────────────────────

interface JsonLdResult {
	address: string | null;
	price: string | null;
	squareFeet: number | null;
	propertyType: string | null;
}

const LISTING_TYPES = new Set(["RealEstateListing", "Product"]);

function extractFromJsonLd(jsonLdItems: unknown[]): JsonLdResult {
	const result: JsonLdResult = { address: null, price: null, squareFeet: null, propertyType: null };

	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		const type = obj["@type"];
		const types = Array.isArray(type) ? (type as string[]) : typeof type === "string" ? [type] : [];

		if (!types.some((t) => LISTING_TYPES.has(t))) continue;

		// Name is typically the full address
		if (!result.address && typeof obj.name === "string") {
			result.address = obj.name;
		}

		// Offers contain price and itemOffered
		const offers = obj.offers as Record<string, unknown> | undefined;
		if (offers) {
			if (!result.price && offers.price !== undefined) {
				const price = Number(offers.price);
				if (!Number.isNaN(price)) {
					const currency = stringVal(offers.priceCurrency) ?? "USD";
					result.price = currency === "USD" ? `$${price.toLocaleString()}` : `${price.toLocaleString()} ${currency}`;
				}
			}

			const itemOffered = offers.itemOffered as Record<string, unknown> | undefined;
			if (itemOffered) {
				// Property type from @type
				const offeredType = stringVal(itemOffered["@type"]);
				if (offeredType && !result.propertyType) {
					// Convert CamelCase to human-readable
					result.propertyType = offeredType.replace(/([a-z])([A-Z])/g, "$1 $2");
				}

				// Floor size
				const floorSize = itemOffered.floorSize as Record<string, unknown> | undefined;
				if (floorSize && result.squareFeet === null) {
					result.squareFeet = numVal(floorSize.value);
				}

				// Address from itemOffered
				if (!result.address) {
					const addr = itemOffered.address as Record<string, unknown> | undefined;
					if (addr) {
						const parts = [
							stringVal(addr.streetAddress),
							stringVal(addr.addressLocality),
							stringVal(addr.addressRegion),
							stringVal(addr.postalCode),
						].filter(Boolean);
						if (parts.length > 0) result.address = parts.join(", ");
					}
				}
			}
		}
	}

	return result;
}

// ── Feature extraction from resoFacts ────────────────────────────────────────

function extractFeatures(prop: ZillowProperty): string[] {
	const features: string[] = [];
	const resoFacts = prop.resoFacts;
	if (!resoFacts) return features;

	// Parking info
	if (resoFacts.hasGarage === true) {
		const capacity = numVal(resoFacts.garageParkingCapacity);
		features.push(capacity ? `Garage (${capacity} spaces)` : "Garage");
	}
	if (resoFacts.hasCarport === true) features.push("Carport");

	// Parking features
	const parkingFeatures = resoFacts.parkingFeatures;
	if (Array.isArray(parkingFeatures)) {
		for (const pf of parkingFeatures) {
			const text = stringVal(pf);
			if (text) features.push(text);
		}
	}

	// Other facts
	const otherFacts = resoFacts.otherFacts;
	if (Array.isArray(otherFacts)) {
		for (const fact of otherFacts) {
			const f = fact as Record<string, unknown>;
			const name = stringVal(f.name);
			const value = stringVal(f.value);
			if (name && value) features.push(`${name}: ${value}`);
		}
	}

	return features;
}

// ── Tax history formatting ───────────────────────────────────────────────────

function formatTaxHistory(prop: ZillowProperty): string | null {
	const history = prop.taxHistory;
	if (!Array.isArray(history) || history.length === 0) return null;

	// Show most recent entry
	const latest = history[0] as Record<string, unknown>;
	const year = stringVal(latest.time);
	const taxPaid = latest.taxPaid;
	const value = latest.value;

	const parts: string[] = [];
	if (year) parts.push(year);
	if (taxPaid !== undefined && taxPaid !== null) parts.push(`Tax: $${Number(taxPaid).toLocaleString()}`);
	if (value !== undefined && value !== null) parts.push(`Assessed: $${Number(value).toLocaleString()}`);

	return parts.length > 0 ? parts.join(" — ") : null;
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseZillow(html: string, url: string): PropertyData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	// 1. Extract from __NEXT_DATA__ (primary source)
	const prop = extractGdpProperty(doc);

	// 2. Extract from JSON-LD (secondary source)
	const jsonLdItems = extractJsonLd(doc);
	const jsonLd = extractFromJsonLd(jsonLdItems);

	// 3. Assemble address
	const address =
		(prop ? formatAddress(prop) : null) ??
		jsonLd.address ??
		getMeta(doc, "og:zillow_fb:address") ??
		null;

	// 4. Price
	let price: string | null = null;
	if (prop?.price !== undefined && prop.price !== null) {
		const p = Number(prop.price);
		if (!Number.isNaN(p)) price = `$${p.toLocaleString()}`;
	}
	if (!price) price = jsonLd.price;

	// 5. Bedrooms / bathrooms
	const bedrooms =
		(prop ? numVal(prop.bedrooms) : null) ??
		(prop?.resoFacts ? numVal(prop.resoFacts.bedrooms) : null);
	const bathrooms =
		(prop ? numVal(prop.bathrooms) : null) ??
		(prop?.resoFacts ? numVal(prop.resoFacts.bathrooms) : null);

	// 6. Square footage
	const squareFeet =
		(prop ? numVal(prop.livingArea) ?? numVal(prop.livingAreaValue) : null) ??
		jsonLd.squareFeet;

	// 7. Lot size
	const lotSize =
		(prop?.resoFacts ? stringVal(prop.resoFacts.lotSize) : null) ??
		(prop?.lotAreaValue !== undefined
			? `${Number(prop.lotAreaValue).toLocaleString()} ${stringVal(prop.lotAreaUnits) ?? "sqft"}`
			: null);

	// 8. Year built
	const yearBuilt =
		(prop ? numVal(prop.yearBuilt) : null) ??
		(prop?.resoFacts ? numVal(prop.resoFacts.yearBuilt) : null);

	// 9. Property type
	const homeType = prop ? stringVal(prop.homeType) : null;
	const propertyType =
		(homeType ? HOME_TYPE_MAP[homeType] ?? homeType.replace(/_/g, " ") : null) ??
		(prop?.resoFacts ? stringVal(prop.resoFacts.homeType) : null) ??
		jsonLd.propertyType;

	// 10. Status
	const homeStatus = prop ? stringVal(prop.homeStatus) : null;
	const status = homeStatus ? STATUS_MAP[homeStatus] ?? homeStatus.replace(/_/g, " ") : null;

	// 11. Description
	const description =
		(prop ? stringVal(prop.description) : null) ??
		getMeta(doc, "og:description");

	// 12. Features from resoFacts
	const features = prop ? extractFeatures(prop) : [];

	// 13. Zestimate
	let zestimate: string | null = null;
	if (prop?.zestimate !== undefined && prop.zestimate !== null) {
		const z = Number(prop.zestimate);
		if (!Number.isNaN(z)) zestimate = `$${z.toLocaleString()}`;
	}

	// 14. Tax history
	const taxHistory = prop ? formatTaxHistory(prop) : null;

	// 14a. Zpid
	const zpid = prop ? stringVal(prop.zpid) : null;

	// 14b. Price history
	const priceHistory: PropertyPriceHistoryEntry[] = [];
	if (prop?.priceHistory && Array.isArray(prop.priceHistory)) {
		for (const entry of prop.priceHistory) {
			const e = entry as Record<string, unknown>;
			const date = stringVal(e.date) ?? stringVal(e.time);
			const event = stringVal(e.event);
			let histPrice: string | null = null;
			if (e.price !== undefined && e.price !== null) {
				const p = Number(e.price);
				if (!Number.isNaN(p)) histPrice = `$${p.toLocaleString()}`;
			}
			const priceChangeRate = e.priceChangeRate !== undefined && e.priceChangeRate !== null
				? `${(Number(e.priceChangeRate) * 100).toFixed(1)}%`
				: null;
			const source = stringVal(e.source);
			if (date || event || histPrice) {
				priceHistory.push({ date, event, price: histPrice, priceChangeRate, source });
			}
		}
	}

	// 15. Agent
	let agent: string | null = null;
	if (prop?.attributionInfo) {
		agent = stringVal(prop.attributionInfo.agentName);
	}
	if (!agent && prop?.listing_agent) {
		agent = stringVal(prop.listing_agent.name);
	}

	// 16. Title
	const title = address ?? pageTitle ?? getMeta(doc, "og:title");

	// Guard: must have some meaningful content
	if (!address && !price && squareFeet === null && !description) {
		throw new Error("No Zillow property content found");
	}

	return {
		type: "property",
		title,
		url,
		address,
		price,
		bedrooms,
		bathrooms,
		squareFeet,
		lotSize,
		yearBuilt,
		propertyType,
		status,
		description,
		features,
		zestimate,
		taxHistory,
		agent,
		zpid,
		priceHistory: priceHistory.length > 0 ? priceHistory : undefined,
	};
}
