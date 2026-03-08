/**
 * job-posting.ts — Shared helpers and JSON-LD extractor for job-board parsers.
 *
 * Exports:
 *   - extractTitle, extractJsonLd, findByType, stringVal, getMeta, getText
 *   - nhm — NodeHtmlMarkdown instance for rendering HTML descriptions
 *   - parseJobPostingFromJsonLd() — extracts JobPosting JSON-LD → JobPostingData | null
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { JobPostingData } from "./page-data";

// ── NHM instance (shared, stateless) ─────────────────────────────────────────

export const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "aside", "header"],
});

// ── DOM helpers ──────────────────────────────────────────────────────────────

export function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

export function getMeta(doc: Document, property: string): string | null {
	let el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	if (!el) el = selectOne(`meta[name="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

export function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

// ── JSON-LD helpers ──────────────────────────────────────────────────────────

export function extractJsonLd(doc: Document): unknown[] {
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

export function findByType(items: unknown[], type: string): Record<string, unknown> | null {
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

export function stringVal(v: unknown): string | null {
	return typeof v === "string" && v.trim() ? v.trim() : null;
}

// ── Job location helper ──────────────────────────────────────────────────────

function extractJobLocation(job: Record<string, unknown>): string | null {
	const jobLoc = job.jobLocation;
	const locObj: Record<string, unknown> | null = Array.isArray(jobLoc)
		? ((jobLoc[0] as Record<string, unknown>) ?? null)
		: (jobLoc as Record<string, unknown> | null);

	if (locObj) {
		const addr = locObj.address as Record<string, unknown> | undefined;
		if (addr) {
			return (
				stringVal(addr.addressLocality) ??
				stringVal(addr.addressRegion) ??
				stringVal(addr.addressCountry) ??
				null
			);
		}
	}

	const locType = stringVal(job.jobLocationType as unknown);
	if (locType) return locType;
	return null;
}

// ── Salary helper ─────────────────────────────────────────────────────────────

function extractSalary(job: Record<string, unknown>): string | null {
	const salaryRaw = job.baseSalary;
	if (!salaryRaw || typeof salaryRaw !== "object") return null;
	const salary = salaryRaw as Record<string, unknown>;
	const valueSpec = salary.value as Record<string, unknown> | undefined;
	if (!valueSpec) return null;
	const currency = stringVal(salary.currency) ?? "";
	const unitText = stringVal(valueSpec.unitText) ?? "";
	const min = valueSpec.minValue;
	const max = valueSpec.maxValue;
	if (min != null && max != null) return `${currency}${min} - ${currency}${max} ${unitText}`.trim();
	if (min != null) return `${currency}${min} ${unitText}`.trim();
	return null;
}

// ── Description helper — render HTML to markdown, cap at 3000 chars ──────────

export function renderDescription(raw: unknown): string | null {
	const str = stringVal(raw);
	if (!str) return null;
	const md = str.includes("<") ? nhm.translate(str) : str;
	return md.slice(0, 3000).trim() || null;
}

// ── Main shared extractor ────────────────────────────────────────────────────

/**
 * Attempt to extract a JobPosting from JSON-LD embedded in the page.
 * Returns null when no JobPosting block is found.
 */
export function parseJobPostingFromJsonLd(
	html: string,
	url: string,
	platform: "linkedin" | "indeed" | "glassdoor" | "wellfound",
): JobPostingData | null {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);
	const ogTitle = getMeta(doc, "og:title");

	const items = extractJsonLd(doc);
	const job = findByType(items, "JobPosting");
	if (!job) return null;

	const jobTitle = stringVal(job.title) ?? stringVal(job.name);
	const hiringOrg = job.hiringOrganization as Record<string, unknown> | undefined;
	const company = hiringOrg ? (stringVal(hiringOrg.name) ?? null) : null;
	const location = extractJobLocation(job);
	const salary = extractSalary(job);
	// employmentType can be a string ("FULL_TIME") or array (["FULL_TIME"])
	const rawEmpType = job.employmentType;
	const employmentType = Array.isArray(rawEmpType)
		? (rawEmpType as unknown[]).map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean).join(", ") || null
		: stringVal(rawEmpType);
	const datePosted = stringVal(job.datePosted);
	const description = renderDescription(job.description);
	const applyUrl = stringVal(job.url) ?? null;

	// jobId from JSON-LD identifier (schema.org pattern: identifier.value or identifier as string)
	const identifier = job.identifier as Record<string, unknown> | string | undefined;
	const jobId = typeof identifier === "string"
		? identifier
		: (identifier ? (stringVal(identifier.value) ?? stringVal(identifier.name)) : null);

	return {
		type: "job",
		title: jobTitle ?? ogTitle ?? pageTitle,
		url,
		platform,
		jobTitle,
		company,
		location,
		salary,
		employmentType,
		datePosted,
		description,
		applyUrl,
		jobId,
	};
}
