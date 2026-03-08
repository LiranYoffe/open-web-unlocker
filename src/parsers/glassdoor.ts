/**
 * glassdoor.ts — Parser for Glassdoor job listings and company pages.
 *
 * URL patterns handled:
 *   Job listing:     /job-listing/<title>-at-<company>-<id>
 *                    /Jobs/<params>
 *   Company:         /Overview/Working-at-<company>-EI_IE<id>.htm
 *   Company reviews: /Reviews/<company>-Reviews-E<id>.htm
 *
 * Extraction priority: JSON-LD JobPosting → DOM (data-test attrs) → og: meta.
 */

import { selectAll } from "css-select";
import type { Element } from "domhandler";
import { textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import {
	extractJsonLd,
	extractTitle,
	findByType,
	getMeta,
	getText,
	parseJobPostingFromJsonLd,
	renderDescription,
	stringVal,
} from "./job-posting";
import type { CompanyData, JobPostingData } from "./page-data";

/** Detect job-listing pages by URL path. */
function isJobPage(pathname: string): boolean {
	const lower = pathname.toLowerCase();
	return (
		lower.includes("/job-listing/") ||
		lower.startsWith("/jobs/") ||
		lower.startsWith("/job/")
	);
}

/** Detect company overview / review pages by URL path. */
function isCompanyPage(pathname: string): boolean {
	const lower = pathname.toLowerCase();
	return (
		lower.startsWith("/overview/") ||
		lower.startsWith("/reviews/") ||
		lower.startsWith("/salary/") ||
		lower.startsWith("/interview/")
	);
}

export function parseGlassdoor(html: string, url: string): CompanyData | JobPostingData {
	const parsedUrl = new URL(url);
	const pathname = parsedUrl.pathname;

	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");

	// ── Job listing page ──────────────────────────────────────────────────
	if (isJobPage(pathname)) {
		// 1. JSON-LD first
		const fromJsonLd = parseJobPostingFromJsonLd(html, url, "glassdoor");
		if (fromJsonLd) return fromJsonLd;

		// 2. DOM fallbacks using data-test attributes
		const jobTitle =
			getText('[data-test="job-title"]', doc) ??
			getText("h1", doc) ??
			ogTitle;

		const company = getText('[data-test="employer-name"]', doc);
		const location = getText('[data-test="location"]', doc);

		const descRaw = getText('[data-test="description"]', doc);
		const description = descRaw ? descRaw.slice(0, 3000).trim() || null : ogDesc?.slice(0, 500) ?? null;

		if (!jobTitle && !company && !ogTitle && !ogDesc) {
			throw new Error("No Glassdoor content found");
		}

		return {
			type: "job",
			title: jobTitle ?? ogTitle ?? pageTitle,
			url,
			platform: "glassdoor",
			jobTitle: jobTitle ?? null,
			company: company ?? null,
			location: location ?? null,
			salary: null,
			employmentType: null,
			datePosted: null,
			description,
			applyUrl: null,
		};
	}

	// ── Company / review page ─────────────────────────────────────────────
	if (isCompanyPage(pathname)) {
		const jsonLdItems = extractJsonLd(doc);
		const org =
			findByType(jsonLdItems, "Organization") ??
			findByType(jsonLdItems, "LocalBusiness") ??
			findByType(jsonLdItems, "EmployerAggregateRating");

		let name: string | null = null;
		let description: string | null = null;
		let industry: string | null = null;
		let employeeCount: string | null = null;
		let companyType: string | null = null;
		let headquarters: string | null = null;
		let website: string | null = null;
		let founded: string | null = null;
		let logoUrl: string | null = null;
		let rating: string | null = null;
		let reviewCount: string | null = null;

		if (org) {
			name = stringVal(org.name);
			description = renderDescription(org.description);
			industry = stringVal(org.industry);
			logoUrl = stringVal(org.logo);
			const empRaw = org.numberOfEmployees as Record<string, unknown> | undefined;
			employeeCount = empRaw
				? (stringVal(empRaw.value) ?? stringVal(empRaw as unknown))
				: null;

			// Glassdoor EmployerAggregateRating has ratingValue
			const ratingObj = org.ratingValue ?? (org as Record<string, unknown>).aggregateRating;
			if (ratingObj != null) rating = String(ratingObj);
		}

		// ── Extract rating/reviews from FAQ JSON-LD ───────────────────────
		const faq = findByType(jsonLdItems, "FAQPage");
		if (faq && !rating) {
			const entities = faq.mainEntity as { acceptedAnswer?: { text?: string } }[] | undefined;
			if (Array.isArray(entities)) {
				for (const q of entities) {
					const answer = q.acceptedAnswer?.text ?? "";
					const ratingMatch = answer.match(/(\d+\.\d+)\s+out of\s+5\s+stars.*?based on\s+([\d,]+)\s+anonymous reviews/);
					if (ratingMatch) {
						if (!rating) rating = ratingMatch[1] ?? null;
						if (!reviewCount) reviewCount = ratingMatch[2]?.replace(/,/g, "") ?? null;
						break;
					}
				}
			}
		}

		// ── Company overview carousel — value/label pairs in carousel cards ──
		// Each card has a title element (value) and a label <span>.
		// Title may be <a> (linked) or another element with CompanyOverview_title class.
		const allSpans = selectAll("span", doc) as unknown as Element[];
		const overviewLabels = ["industry", "website", "headquarters", "founded", "employees", "company"];
		for (const span of allSpans) {
			if (!(span.attribs?.class ?? "").includes("CompanyOverview_label")) continue;
			const label = textContent(span).trim().toLowerCase();
			if (!overviewLabels.includes(label)) continue;

			// Find the value sibling: element with CompanyOverview_title class in the same parent
			const parent = span.parent as Element | null;
			if (!parent?.children) continue;

			let value: string | null = null;
			let href: string | null = null;
			for (const child of parent.children) {
				const el = child as Element;
				if (el.attribs?.class?.includes("CompanyOverview_title")) {
					value = textContent(el).trim() || null;
					// For website, extract href instead of display text
					if (el.attribs?.href) href = el.attribs.href;
					break;
				}
			}
			if (!value && !href) continue;

			if (!industry && label === "industry") industry = value;
			else if (!headquarters && label === "headquarters") headquarters = value;
			else if (!founded && label === "founded") founded = value;
			else if (!employeeCount && label === "employees") employeeCount = value;
			else if (!companyType && label === "company") companyType = value;
			else if (!website && label === "website") website = href ?? value;
		}

		// Rating from DOM
		const ratingText = getText('[data-test="rating"]', doc);
		if (ratingText && !rating) rating = ratingText;

		// Fallbacks
		name = name ?? ogTitle ?? pageTitle;
		description = description ?? ogDesc ?? null;

		if (!name && !description) {
			throw new Error("No Glassdoor content found");
		}

		return {
			type: "company",
			title: name ?? ogTitle ?? pageTitle,
			url,
			platform: "glassdoor",
			name,
			description,
			industry,
			employeeCount,
			companyType,
			headquarters,
			website,
			founded,
			logoUrl,
			rating,
			reviewCount,
		};
	}

	// ── Other Glassdoor page ──────────────────────────────────────────────
	const fromJsonLd = parseJobPostingFromJsonLd(html, url, "glassdoor");
	if (fromJsonLd) return fromJsonLd;

	if (!ogTitle && !ogDesc) {
		throw new Error("No Glassdoor content found");
	}

	return {
		type: "job",
		title: ogTitle ?? pageTitle,
		url,
		platform: "glassdoor",
		jobTitle: ogTitle,
		company: null,
		location: null,
		salary: null,
		employmentType: null,
		datePosted: null,
		description: ogDesc,
		applyUrl: null,
	};
}
