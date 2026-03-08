/**
 * indeed.ts — Parser for Indeed.com job listings and company profiles.
 *
 * URL patterns handled:
 *   Job detail:     /viewjob?jk=<id>
 *   Job search:     /jobs?...
 *   Company page:   /cmp/<company>/
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
	nhm,
	parseJobPostingFromJsonLd,
	stringVal,
} from "./job-posting";
import type { CompanyData, JobPostingData } from "./page-data";

type IndeedInitialData = {
	aboutSectionViewModel?: {
		aboutCompany?: {
			name?: string;
			description?: string;
			industry?: string;
			employeeRange?: string;
			founded?: number | string;
			headquartersLocation?: { address?: string };
			websiteUrl?: { url?: string };
		};
		relatedLinks?: {
			relatedLinksItems?: Array<{
				entityName?: string;
				url?: string;
			}>;
		};
	};
	companyPageHeader?: {
		companyHeader?: {
			name?: string;
			rating?: number | string;
			reviewCount?: number | string;
			reviewCountFormatted?: string;
		};
	};
	happinessModule?: {
		compositeScore?: number | string;
	};
};

function extractIndeedInitialData(doc: ReturnType<typeof parseDocument>): IndeedInitialData | null {
	const script = selectOne('#comp-initialData[type="application/json"]', doc) as Element | null;
	if (!script) return null;
	try {
		return JSON.parse(textContent(script)) as IndeedInitialData;
	} catch {
		return null;
	}
}

function formatIndeedEmployeeRange(value: string | null): string | null {
	if (!value) return null;
	if (value === "ERv1_10000_PLUS") return "more than 10,000";

	const normalized = value
		.replace(/^ERv1_/, "")
		.replace(/_PLUS$/, "+")
		.replace(/_/g, " ")
		.toLowerCase();

	return normalized || value;
}

function isCompanyPage(pathname: string): boolean {
	return pathname.startsWith("/cmp/");
}

function isJobPage(pathname: string, search: string): boolean {
	return pathname.startsWith("/viewjob") || search.includes("jk=");
}

export function parseIndeed(html: string, url: string): CompanyData | JobPostingData {
	const parsedUrl = new URL(url);
	const pathname = parsedUrl.pathname;
	const search = parsedUrl.search;

	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");

	// ── Company profile page ──────────────────────────────────────────────
	if (isCompanyPage(pathname)) {
		const jsonLdItems = extractJsonLd(doc);
		const org = findByType(jsonLdItems, "Organization") ?? findByType(jsonLdItems, "LocalBusiness");
		const initialData = extractIndeedInitialData(doc);
		const aboutCompany = initialData?.aboutSectionViewModel?.aboutCompany;
		const headerCompany = initialData?.companyPageHeader?.companyHeader;

		let name: string | null = null;
		let description: string | null = null;
		let industry: string | null = null;
		let employeeCount: string | null = null;
		let rating: string | null = null;
		let reviewCount: string | null = null;
		let headquarters: string | null = null;
		let founded: string | null = null;
		let website: string | null = null;

		if (org) {
			name = stringVal(org.name);
			description = stringVal(org.description);
			industry = stringVal(org.industry);
			const empRaw = org.numberOfEmployees as Record<string, unknown> | undefined;
			employeeCount = empRaw
				? (stringVal(empRaw.value) ?? stringVal(empRaw as unknown))
				: null;

			// Extract rating/reviewCount from aggregateRating
			const aggRating = org.aggregateRating as Record<string, unknown> | undefined;
			if (aggRating) {
				const ratingVal = aggRating.ratingValue;
				if (ratingVal != null) rating = String(ratingVal);
				const revCount = aggRating.reviewCount;
				if (revCount != null) reviewCount = String(revCount);
			}
		}

		if (aboutCompany) {
			name = name ?? stringVal(aboutCompany.name);
			description = description ?? stringVal(aboutCompany.description);
			industry = industry ?? stringVal(aboutCompany.industry);
			employeeCount = employeeCount ?? formatIndeedEmployeeRange(stringVal(aboutCompany.employeeRange));
			headquarters = stringVal(aboutCompany.headquartersLocation?.address);
			website = stringVal(aboutCompany.websiteUrl?.url);
			if (aboutCompany.founded != null) founded = String(aboutCompany.founded);
		}

		if (headerCompany) {
			name = name ?? stringVal(headerCompany.name);
			if (!rating && headerCompany.rating != null) rating = String(headerCompany.rating);
			if (!reviewCount) {
				if (headerCompany.reviewCountFormatted != null) reviewCount = String(headerCompany.reviewCountFormatted);
				else if (headerCompany.reviewCount != null) reviewCount = String(headerCompany.reviewCount);
			}
		}

		let workHappinessScore: string | null = null;
		const happinessScore = initialData?.happinessModule?.compositeScore;
		if (happinessScore != null) {
			workHappinessScore = `${happinessScore}%`;
		} else {
			const happyEl = selectOne('[data-testid="work-happiness-score"]', doc) as Element | null;
			if (happyEl) {
				const happyText = textContent(happyEl).trim();
				const happyMatch = happyText.match(/(\d+)%/);
				if (happyMatch) workHappinessScore = `${happyMatch[1]}%`;
			}
		}

		name = name ?? ogTitle ?? pageTitle;
		description = description ?? ogDesc;

		if (!name && !description) {
			throw new Error("No Indeed content found");
		}

		return {
			type: "company",
			title: name ?? ogTitle ?? pageTitle,
			url,
			platform: "indeed",
			name,
			description,
			industry,
			employeeCount,
			headquarters,
			website,
			founded,
			rating,
			reviewCount,
			workHappinessScore,
			...(initialData?.aboutSectionViewModel?.relatedLinks?.relatedLinksItems?.length
				? {
					similarPages: initialData.aboutSectionViewModel.relatedLinks.relatedLinksItems
						.map((item) => ({
							name: item.entityName ?? "",
							description: null,
							url: item.url ? new URL(item.url, "https://www.indeed.com").toString() : null,
						}))
						.filter((item) => item.name),
				}
				: {}),
		};
	}

	// ── Job detail page ───────────────────────────────────────────────────
	if (isJobPage(pathname, search) || pathname === "/") {
		// Job ID from URL parameter ?jk=<id>
		const jobId = parsedUrl.searchParams.get("jk") ?? null;

		// 1. Try JSON-LD first
		const fromJsonLd = parseJobPostingFromJsonLd(html, url, "indeed");
		if (fromJsonLd) {
			// Augment with jobId from URL if not already set
			if (!fromJsonLd.jobId && jobId) fromJsonLd.jobId = jobId;
			return fromJsonLd;
		}

		// 2. DOM fallbacks
		const titleEl =
			(selectOne('h1[data-testid="jobsearch-JobInfoHeader-title"]', doc) as Element | null) ??
			(selectOne("h1", doc) as Element | null);
		const jobTitle = titleEl ? textContent(titleEl).trim() || null : null;

		const companyEl = selectOne('[data-testid="inlineHeader-companyName"] a', doc) as Element | null;
		const companyAttr = selectOne("[data-company-name]", doc) as Element | null;
		const company =
			(companyEl ? textContent(companyEl).trim() || null : null) ??
			(companyAttr ? (companyAttr.attribs["data-company-name"]?.trim() || null) : null);

		const location = getText('[data-testid="job-location"]', doc);

		// Employment type from DOM: data-testid metadata or job details section
		const employmentType =
			getText('[data-testid="jobsearch-JobMetadataHeader-employmentType"]', doc)
			?? getText('[data-testid="job-type"]', doc);

		// Description: render #jobDescriptionText to markdown, cap at 3000 chars
		const descEl = selectOne("#jobDescriptionText", doc) as Element | null;
		let description: string | null = null;
		if (descEl) {
			const rendered = nhm.translate(textContent(descEl));
			description = rendered.slice(0, 3000).trim() || null;
		}

		const datePosted = getText('[data-testid="job-age"]', doc);

		if (!jobTitle && !company && !ogTitle && !ogDesc) {
			throw new Error("No Indeed content found");
		}

		return {
			type: "job",
			title: jobTitle ?? ogTitle ?? pageTitle,
			url,
			platform: "indeed",
			jobTitle: jobTitle ?? ogTitle,
			company,
			location,
			salary: null,
			employmentType,
			datePosted,
			description: description ?? ogDesc?.slice(0, 3000) ?? null,
			applyUrl: null,
			jobId,
		};
	}

	// ── Other Indeed page ─────────────────────────────────────────────────
	if (!ogTitle && !ogDesc) {
		throw new Error("No Indeed content found");
	}

	return {
		type: "job",
		title: ogTitle ?? pageTitle,
		url,
		platform: "indeed",
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
