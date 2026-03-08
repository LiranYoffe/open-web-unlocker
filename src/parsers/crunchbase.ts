/**
 * crunchbase.ts — Crunchbase company profile page parser.
 *
 * Strategy:
 *   1. JSON-LD WebPage → mainEntity (Corporation/Organization) for name, description,
 *      founders, employees, board members, investors, address, social links.
 *   2. JSON-LD FAQPage for competitors and summary Q&A.
 *   3. DOM label-with-info elements for legal name, aliases, operating status,
 *      company type, contact info, hub tags.
 *   4. DOM a[href*="/search/"] links for employee range, last funding type, categories.
 *   5. og:* meta tags as fallbacks.
 *
 * Crunchbase is an Angular SPA. Some fields (total funding, founded date) may be
 * "obfuscated" behind a paywall — these are skipped.
 *
 * Selector priority: JSON-LD → label-with-info → a[href] → og:* meta
 * Never use: [class*=...] substring class selectors
 */

import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type {
	CompanyData,
	CompanyEmployee,
	PageData,
	SearchResultsData,
	SimilarPage,
} from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getMeta(doc: Document, name: string, attr = "name"): string | null {
	const el = selectOne(`meta[${attr}="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function extractJsonLd(doc: Document): unknown[] {
	const scripts = selectAll(
		'script[type="application/ld+json"]',
		doc,
	) as unknown as Element[];
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

function stringVal(v: unknown): string | null {
	return typeof v === "string" && v.trim() ? v.trim() : null;
}

function normalizeText(value: string | null | undefined): string | null {
	if (!value) return null;
	const normalized = value.trim().replace(/\s+/g, " ");
	return normalized || null;
}

function absoluteUrl(baseUrl: string, href: string | null | undefined): string | null {
	if (!href) return null;
	try {
		return new URL(href, baseUrl).toString();
	} catch {
		return null;
	}
}

/** Returns true if a string looks like Crunchbase paywall obfuscation */
function isObfuscated(s: string): boolean {
	return /obfuscated/i.test(s);
}

// ── JSON-LD extraction ───────────────────────────────────────────────────────

interface CrunchbaseJsonLd {
	name: string | null;
	legalName: string | null;
	description: string | null;
	address: string | null;
	website: string | null;
	logoUrl: string | null;
	founders: string[];
	employees: CompanyEmployee[];
	boardMembers: string[];
	investors: string[];
	aliases: string[];
}

function extractCorporationData(jsonLdItems: unknown[]): CrunchbaseJsonLd {
	const result: CrunchbaseJsonLd = {
		name: null,
		legalName: null,
		description: null,
		address: null,
		website: null,
		logoUrl: null,
		founders: [],
		employees: [],
		boardMembers: [],
		investors: [],
		aliases: [],
	};

	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] !== "WebPage") continue;

		const entity = obj.mainEntity as Record<string, unknown> | undefined;
		if (!entity) continue;

		const entityType = stringVal(entity["@type"]);
		if (
			entityType !== "Corporation" &&
			entityType !== "Organization"
		)
			continue;

		result.name = stringVal(entity.name);
		result.legalName = stringVal(entity.legalName);
		result.description = stringVal(entity.description);
		result.logoUrl = stringVal(entity.logo) ?? stringVal(entity.image);

		// Address
		const addr = entity.address as Record<string, unknown> | undefined;
		if (addr) {
			const parts = [
				stringVal(addr.addressLocality),
				stringVal(addr.addressRegion),
				stringVal(addr.addressCountry),
			].filter(Boolean);
			if (parts.length > 0) result.address = parts.join(", ");
		}

		// Website from sameAs (pick the non-social one)
		const sameAs = entity.sameAs;
		if (Array.isArray(sameAs)) {
			for (const url of sameAs) {
				const u = stringVal(url);
				if (
					u &&
					!u.includes("crunchbase.com") &&
					!u.includes("facebook.com") &&
					!u.includes("linkedin.com") &&
					!u.includes("twitter.com") &&
					!u.includes("instagram.com") &&
					!u.includes("angel.co")
				) {
					result.website = u;
					break;
				}
			}
		}

		// Alternate names
		const altNames = entity.alternateName;
		if (Array.isArray(altNames)) {
			for (const n of altNames) {
				const s = stringVal(n);
				if (s) result.aliases.push(s);
			}
		}

		// Founders
		const founders = entity.founder;
		if (Array.isArray(founders)) {
			for (const f of founders) {
				const person = f as Record<string, unknown>;
				const name = stringVal(person.name);
				if (name) result.founders.push(name);
			}
		}

		// Employees (key people with job titles)
		const employees = entity.employee;
		if (Array.isArray(employees)) {
			for (const e of employees) {
				const person = e as Record<string, unknown>;
				const name = stringVal(person.name);
				const jobTitle = stringVal(person.jobTitle);
				if (name) {
					const displayName = jobTitle
						? `${name} — ${jobTitle}`
						: name;
					const profileUrl = stringVal(person.url);
					result.employees.push({ name: displayName, profileUrl });
				}
			}
		}

		// Board members
		const members = entity.member;
		if (Array.isArray(members)) {
			for (const m of members) {
				const person = m as Record<string, unknown>;
				const name = stringVal(person.name);
				if (name) result.boardMembers.push(name);
			}
		}

		// Investors/funders
		const funders = entity.funder;
		if (Array.isArray(funders)) {
			for (const f of funders) {
				const org = f as Record<string, unknown>;
				const name = stringVal(org.name);
				if (name) result.investors.push(name);
			}
		}

		break; // Only process the first Corporation entity
	}

	return result;
}

/** Extract competitors from FAQPage JSON-LD */
function extractCompetitors(jsonLdItems: unknown[]): SimilarPage[] {
	for (const item of jsonLdItems) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] !== "FAQPage") continue;

		const questions = obj.mainEntity;
		if (!Array.isArray(questions)) continue;

		for (const q of questions) {
			const question = q as Record<string, unknown>;
			const name = stringVal(question.name);
			if (!name || !/competitor/i.test(name)) continue;

			const answer = question.acceptedAnswer as
				| Record<string, unknown>
				| undefined;
			const text = answer ? stringVal(answer.text) : null;
			if (!text) continue;

			// Parse "may include X, Y, And Z."
			const match = text.match(/include\s+(.*?)\.?$/i);
			if (!match?.[1]) continue;

			return match[1]
				.split(/,\s*(?:and\s+)?/i)
				.map((s) => s.trim())
				.filter((s) => s.length > 0)
				.map((name) => ({ name, description: null, url: null }));
		}
	}
	return [];
}

// ── DOM extraction ───────────────────────────────────────────────────────────

interface DomData {
	legalName: string | null;
	aliases: string[];
	operatingStatus: string | null;
	companyType: string | null;
	contactEmail: string | null;
	phone: string | null;
	fundingRounds: string | null;
	categories: string[];
	employeeRange: string | null;
	lastFundingType: string | null;
}

function extractDomData(doc: Document): DomData {
	const result: DomData = {
		legalName: null,
		aliases: [],
		operatingStatus: null,
		companyType: null,
		contactEmail: null,
		phone: null,
		fundingRounds: null,
		categories: [],
		employeeRange: null,
		lastFundingType: null,
	};

	// Extract label-with-info → value pairs
	const labels = selectAll("label-with-info", doc) as unknown as Element[];
	const seen = new Set<string>();
	for (const label of labels) {
		const labelText = textContent(label).trim().replace(/\s+/g, " ");
		if (seen.has(labelText)) continue;
		seen.add(labelText);

		const parent = label.parentNode;
		if (!parent) continue;

		const fullText = textContent(parent as Element)
			.trim()
			.replace(/\s+/g, " ");
		const valueStart = fullText.indexOf(labelText) + labelText.length;
		const rawValue = fullText.substring(valueStart).trim();

		// Skip obfuscated values
		if (isObfuscated(rawValue)) continue;
		if (!rawValue) continue;

		switch (labelText) {
			case "Legal Name":
				result.legalName = rawValue;
				break;
			case "Also Known As":
				result.aliases = rawValue
					.split(",")
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				break;
			case "Operating Status":
				result.operatingStatus = rawValue;
				break;
			case "Company Type":
				result.companyType = rawValue;
				break;
			case "Contact Email":
				result.contactEmail = rawValue;
				break;
			case "Phone Number":
				result.phone = rawValue;
				break;
			case "Number of Funding Rounds":
				result.fundingRounds = rawValue;
				break;
		}
	}

	// Extract categories from /categories/ links
	const catLinks = selectAll(
		'a[href*="/categories/"]',
		doc,
	) as unknown as Element[];
	const catSet = new Set<string>();
	for (const a of catLinks) {
		const text = textContent(a).trim();
		if (text && !catSet.has(text)) {
			catSet.add(text);
			result.categories.push(text);
		}
	}

	// Extract employee range from /num_employees_enum/ link
	const empLinks = selectAll(
		'a[href*="/num_employees_enum/"]',
		doc,
	) as unknown as Element[];
	for (const a of empLinks) {
		const text = textContent(a).trim();
		if (text) {
			result.employeeRange = text;
			break;
		}
	}

	// Extract last funding type from /last_funding_type/ link
	const fundLinks = selectAll(
		'a[href*="/last_funding_type/"]',
		doc,
	) as unknown as Element[];
	for (const a of fundLinks) {
		const text = textContent(a).trim();
		if (text) {
			result.lastFundingType = text;
			break;
		}
	}

	return result;
}

function isCrunchbaseSearchPage(url: string): boolean {
	const pathname = new URL(url).pathname;
	return pathname.startsWith("/discover/") || pathname.startsWith("/search/organizations/");
}

function extractCrunchbaseSearchQuery(doc: Document, url: string): string | null {
	const directQuery = new URL(url).searchParams.get("q");
	if (directQuery?.trim()) {
		return directQuery.trim();
	}

	const chip = selectOne("chip.primary", doc) as Element | null;
	if (chip) {
		return normalizeText(textContent(chip));
	}

	return null;
}

function extractCrunchbaseSearchResults(doc: Document, url: string): SearchResultsData {
	const rows = selectAll("grid-body grid-row", doc) as unknown as Element[];
	const results: SearchResultsData["results"] = [];
	const seenUrls = new Set<string>();

	for (const row of rows) {
		const identifierCell = selectOne('grid-cell[data-columnid="identifier"]', row) as Element | null;
		const companyLink = identifierCell
			? (selectOne('a[href^="/organization/"]', identifierCell) as Element | null)
			: null;
		const companyName = companyLink ? normalizeText(textContent(companyLink)) : null;
			const companyUrl = absoluteUrl(
				url,
				companyLink ? getAttributeValue(companyLink, "href") : null,
			);
		if (!companyName || !companyUrl || seenUrls.has(companyUrl)) {
			continue;
		}
		seenUrls.add(companyUrl);

		const categoriesCell = selectOne('grid-cell[data-columnid="categories"]', row) as Element | null;
		const locationCell = selectOne(
			'grid-cell[data-columnid="location_identifiers"]',
			row,
		) as Element | null;
		const descriptionCell = selectOne(
			'grid-cell[data-columnid="short_description"]',
			row,
		) as Element | null;
		const rankCell = selectOne('grid-cell[data-columnid="rank_org"]', row) as Element | null;
		const imageEl = identifierCell
			? (selectOne("img", identifierCell) as Element | null)
			: null;

		const categories = categoriesCell
			? selectAll("a", categoriesCell)
					.map((anchor) => normalizeText(textContent(anchor as Element)))
					.filter((value): value is string => Boolean(value))
			: [];
		const location = locationCell ? normalizeText(textContent(locationCell)) : null;
		const description = descriptionCell ? normalizeText(textContent(descriptionCell)) : null;
		const rank = rankCell ? normalizeText(textContent(rankCell)) : null;
			const imageUrl = absoluteUrl(url, imageEl ? getAttributeValue(imageEl, "src") : null);

		const snippetParts: string[] = [];
		if (description) snippetParts.push(description);
		if (rank) snippetParts.push(`CB Rank ${rank}`);

		results.push({
			position: results.length + 1,
			title: companyName,
			url: companyUrl,
			snippet: snippetParts.length > 0 ? snippetParts.join(" | ") : null,
			location,
			displayUrl: location ?? undefined,
			rank,
			imageUrl,
			category: categories.length > 0 ? categories.join(", ") : null,
			resultType: "Organization",
		});
	}

	if (results.length === 0) {
		throw new Error("No Crunchbase search results found");
	}

	const query = extractCrunchbaseSearchQuery(doc, url);
	const title = query ? `Crunchbase Search: ${query}` : "Crunchbase Search Results";

	return {
		type: "search-results",
		title,
		url,
		engine: "crunchbase",
		query,
		results,
	};
}

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseCrunchbase(html: string, url: string): PageData {
	const doc = parseDocument(html);
	if (isCrunchbaseSearchPage(url)) {
		return extractCrunchbaseSearchResults(doc, url);
	}

	const pageTitle = extractTitle(doc);
	const jsonLdItems = extractJsonLd(doc);

	// 1. JSON-LD Corporation data (primary source)
	const corp = extractCorporationData(jsonLdItems);

	// 2. DOM-based data (supplementary)
	const dom = extractDomData(doc);

	// 3. Competitors from FAQ JSON-LD
	const competitors = extractCompetitors(jsonLdItems);

	// 4. Assemble name
	const name =
		corp.name ??
		getMeta(doc, "og:title", "property")
			?.replace(/\s*-\s*Crunchbase.*$/i, "")
			.trim() ??
		null;

	// 5. Description
	const description =
		corp.description ??
		getMeta(doc, "og:description", "property") ??
		getMeta(doc, "description");

	// 6. Title
	const title = name
		? `${name} — Crunchbase Company Profile`
		: pageTitle;

	if (!name && !description) {
		throw new Error("No Crunchbase company content found");
	}

	return {
		type: "company",
		title,
		url,
		platform: "crunchbase",
		name,
		description,
		industry: dom.categories[0] ?? null,
		employeeCount: dom.employeeRange,
		companyType: dom.companyType,
		headquarters: corp.address,
		website: corp.website,
		specialties: dom.categories,
		logoUrl: corp.logoUrl,
		employees: corp.employees,
		similarPages: competitors,
		// Crunchbase-specific fields
		legalName: dom.legalName ?? corp.legalName,
		aliases: dom.aliases.length > 0 ? dom.aliases : corp.aliases,
		operatingStatus: dom.operatingStatus,
		founders: corp.founders,
		investors: corp.investors,
		boardMembers: corp.boardMembers,
		fundingRounds: dom.fundingRounds,
		lastFundingType: dom.lastFundingType,
		contactEmail: dom.contactEmail,
		phone: dom.phone,
	};
}
