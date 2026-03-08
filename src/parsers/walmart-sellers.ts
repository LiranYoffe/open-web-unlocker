/**
 * walmart-sellers.ts — Walmart seller/storefront profile page parser.
 *
 * URL patterns handled:
 *   Seller profile: /seller/<catalogSellerId>
 *
 * Strategy:
 *   1. Extract __NEXT_DATA__ script tag (Walmart is a Next.js app).
 *      Path: props.pageProps.initialData.seller
 *      Contains: catalogSellerId, sellerName, sellerDisplayName, sellerEmail,
 *      sellerPhone, sellerAboutUs, address, sellerReviews, sellerLogoURL, etc.
 *   2. Fall back to og:* meta tags for minimal data.
 *
 * The seller object in __NEXT_DATA__ is the single source of truth — there is
 * no JSON-LD on seller pages and the DOM is entirely React-rendered with no
 * stable data-testid attributes for seller info.
 *
 * Returns CompanyData (platform: "walmart" — requires page-data.ts union update
 * for full type safety; see integration report).
 *
 * Selector priority: __NEXT_DATA__ → og:* meta tags
 */

import { selectOne } from "css-select";
import type { Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { CompanyData } from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMeta(doc: ReturnType<typeof parseDocument>, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	if (el) return getAttributeValue(el, "content")?.trim() || null;
	const named = selectOne(`meta[name="${property}"]`, doc) as Element | null;
	if (named) return getAttributeValue(named, "content")?.trim() || null;
	return null;
}

function getTitle(doc: ReturnType<typeof parseDocument>): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

// ── __NEXT_DATA__ extraction ─────────────────────────────────────────────────

interface SellerReviewSummary {
	totalReviewCount?: number;
	reviewsWithTextCount?: number;
	averageOverallRating?: number;
}

interface SellerData {
	catalogSellerId?: string;
	sellerId?: string;
	sellerName?: string;
	sellerDisplayName?: string;
	sellerEmail?: string;
	sellerPhone?: string;
	sellerAboutUs?: string;
	address1?: string | null;
	address2?: string | null;
	city?: string | null;
	state?: string | null;
	postalCode?: string | null;
	country?: string | null;
	sellerLogoURL?: string | null;
	deactivationStatus?: string;
	sellerType?: string;
	hasSellerBadge?: boolean;
	sellerReviews?: {
		reviewSummary?: SellerReviewSummary;
	};
}

interface SeoSellerMetaData {
	metaTitle?: string | null;
	metaDesc?: string | null;
}

function extractNextDataSeller(html: string): { seller: SellerData | null; seo: SeoSellerMetaData | null } {
	const doc = parseDocument(html);
	const nextDataEl = selectOne('script[id="__NEXT_DATA__"]', doc) as Element | null;
	if (!nextDataEl) return { seller: null, seo: null };

	try {
		const json = JSON.parse(textContent(nextDataEl)) as Record<string, unknown>;
		const props = (json.props as Record<string, unknown> | undefined) ?? {};
		const pageProps = (props.pageProps as Record<string, unknown> | undefined) ?? {};
		const initialData = (pageProps.initialData as Record<string, unknown> | undefined) ?? {};

		const seller = (initialData.seller as SellerData | null | undefined) ?? null;
		const seo = (initialData.seoSellerMetaData as SeoSellerMetaData | null | undefined) ?? null;

		return { seller, seo };
	} catch {
		return { seller: null, seo: null };
	}
}

// ── Address assembly ─────────────────────────────────────────────────────────

function buildAddress(seller: SellerData): string | null {
	const parts: string[] = [];
	if (seller.address1) parts.push(seller.address1);
	if (seller.address2) parts.push(seller.address2);

	const cityState: string[] = [];
	if (seller.city) cityState.push(seller.city);
	if (seller.state) cityState.push(seller.state);
	if (cityState.length > 0) {
		const cityStateStr = cityState.join(", ");
		if (seller.postalCode) {
			parts.push(`${cityStateStr} ${seller.postalCode}`);
		} else {
			parts.push(cityStateStr);
		}
	} else if (seller.postalCode) {
		parts.push(seller.postalCode);
	}

	if (seller.country && seller.country !== "US") parts.push(seller.country);

	return parts.length > 0 ? parts.join(", ") : null;
}

// ── Phone formatting ─────────────────────────────────────────────────────────

function formatPhone(raw: string | undefined): string | null {
	if (!raw) return null;
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	}
	if (digits.length === 11 && digits.startsWith("1")) {
		return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
	}
	return raw;
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseWalmartSeller(html: string, url: string): CompanyData {
	const { seller, seo } = extractNextDataSeller(html);
	const doc = parseDocument(html);

	// Guard: no seller data means this is not a valid seller page
	if (!seller || (!seller.sellerDisplayName && !seller.sellerName)) {
		throw new Error("No Walmart seller data found");
	}

	const displayName = seller.sellerDisplayName?.trim() || null;
	const legalName = seller.sellerName?.trim() || null;
	const name = displayName ?? legalName;

	// Rating and reviews
	const reviewSummary = seller.sellerReviews?.reviewSummary;
	const avgRating = reviewSummary?.averageOverallRating;
	const totalReviews = reviewSummary?.totalReviewCount;
	const rating =
		avgRating !== undefined && avgRating !== null && avgRating > 0
			? String(Math.round(avgRating * 10) / 10)
			: null;
	const reviewCount =
		totalReviews !== undefined && totalReviews !== null && totalReviews > 0
			? String(totalReviews)
			: null;

	// Description: sellerAboutUs, then seo meta, then og:description
	const description =
		seller.sellerAboutUs?.trim() ||
		seo?.metaDesc?.trim() ||
		getMeta(doc, "og:description") ||
		null;

	// Title: from seo meta or og:title or page <title>
	const title =
		seo?.metaTitle?.trim() ||
		getMeta(doc, "og:title") ||
		getTitle(doc) ||
		(name ? `${name} - Walmart Seller` : null);

	// Phone and email
	const phone = formatPhone(seller.sellerPhone);
	const email = seller.sellerEmail?.trim() || null;

	// Address
	const headquarters = buildAddress(seller);

	// Seller ID as tagline-like info
	const tagline = seller.catalogSellerId ? `Walmart Seller #${seller.catalogSellerId}` : null;

	// Company type from sellerType and deactivationStatus
	const statusParts: string[] = [];
	if (seller.sellerType) statusParts.push(seller.sellerType);
	if (seller.deactivationStatus) statusParts.push(seller.deactivationStatus);
	const companyType = statusParts.length > 0 ? statusParts.join(" / ") : null;

	return {
		type: "company",
		platform: "walmart" as CompanyData["platform"],
		title,
		url,
		name,
		tagline,
		description,
		companyType,
		headquarters,
		logoUrl: seller.sellerLogoURL ?? null,
		rating,
		reviewCount,
		// Walmart-specific: use optional Crunchbase fields for seller details
		legalName: legalName !== displayName ? legalName : null,
		contactEmail: email,
		phone,
	};
}
