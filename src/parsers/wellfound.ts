/**
 * wellfound.ts — Parser for Wellfound (formerly AngelList) job listings and company pages.
 *
 * URL patterns handled:
 *   Job detail:  /l/2<hash>
 *                /jobs/<company>/<title>-<id>
 *   Company:     /company/<name>
 *   Job search:  /jobs
 *
 * Extraction priority: JSON-LD JobPosting → DOM fallbacks → og: meta.
 */

import { selectOne } from "css-select";
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

/** Detect job detail pages by URL path. */
function isJobPage(pathname: string): boolean {
	return /^\/l\//.test(pathname) || /^\/jobs\/[^/]+\//.test(pathname);
}

/** Detect company pages by URL path. */
function isCompanyPage(pathname: string): boolean {
	return pathname.startsWith("/company/");
}

export function parseWellfound(html: string, url: string): CompanyData | JobPostingData {
	const parsedUrl = new URL(url);
	const pathname = parsedUrl.pathname;

	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");

	// ── Job detail page ───────────────────────────────────────────────────
	if (isJobPage(pathname)) {
		// 1. JSON-LD first
		const fromJsonLd = parseJobPostingFromJsonLd(html, url, "wellfound");
		if (fromJsonLd) return fromJsonLd;

		// 2. DOM fallbacks
		const titleEl = selectOne("h1", doc) as Element | null;
		const jobTitle =
			(titleEl ? textContent(titleEl).trim() || null : null) ??
			getText('[data-test="job-title"]', doc) ??
			ogTitle;

		const company = getText('[data-test="company-name"]', doc);
		const location = getText('[data-test="job-location"]', doc);

		const descRaw = getText('[data-test="job-description"]', doc);
		const description = descRaw
			? renderDescription(descRaw)
			: ogDesc?.slice(0, 3000) ?? null;

		if (!jobTitle && !company && !ogTitle && !ogDesc) {
			throw new Error("No Wellfound content found");
		}

		return {
			type: "job",
			title: jobTitle ?? ogTitle ?? pageTitle,
			url,
			platform: "wellfound",
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

	// ── Company page ──────────────────────────────────────────────────────
	if (isCompanyPage(pathname)) {
		const jsonLdItems = extractJsonLd(doc);
		const org =
			findByType(jsonLdItems, "Organization") ??
			findByType(jsonLdItems, "SoftwareApplication");

		let name: string | null = null;
		let description: string | null = null;
		let industry: string | null = null;
		let employeeCount: string | null = null;

		if (org) {
			name = stringVal(org.name);
			description = renderDescription(org.description);
			industry = stringVal(org.industry);
			const empRaw = org.numberOfEmployees as Record<string, unknown> | undefined;
			employeeCount = empRaw
				? (stringVal(empRaw.value) ?? stringVal(empRaw as unknown))
				: null;
		}

		name = name ?? ogTitle ?? pageTitle;
		description = description ?? ogDesc ?? null;

		if (!name && !description) {
			throw new Error("No Wellfound content found");
		}

		return {
			type: "company",
			title: name ?? ogTitle ?? pageTitle,
			url,
			platform: "wellfound",
			name,
			description,
			industry,
			employeeCount,
		};
	}

	// ── Other Wellfound page (e.g. /jobs search results) ─────────────────
	const fromJsonLd = parseJobPostingFromJsonLd(html, url, "wellfound");
	if (fromJsonLd) return fromJsonLd;

	if (!ogTitle && !ogDesc) {
		throw new Error("No Wellfound content found");
	}

	return {
		type: "job",
		title: ogTitle ?? pageTitle,
		url,
		platform: "wellfound",
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
