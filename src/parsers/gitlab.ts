import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { IssueComment, RepoData } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "aside", "svg"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function extractTitle(doc: Document): string | null {
	const el = selectOne("title", doc) as Element | null;
	if (!el) return null;
	const raw = textContent(el).trim();
	return raw.replace(/\s*[·|–-]\s*GitLab\s*$/, "").trim() || null;
}

function getMeta(doc: Document, name: string, attr = "name"): string | null {
	const el = selectOne(`meta[${attr}="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
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
			// Ignore
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

export function parseGitLab(html: string, url: string): RepoData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	const pathname = new URL(url).pathname;

	// ── Issue / MR page ───────────────────────────────────────────────────
	const isIssue = /\/-\/issues\/\d+/.test(pathname);
	const isMR = /\/-\/merge_requests\/\d+/.test(pathname);

	if (isIssue || isMR) {
		const issueTitle =
			getText("h1.title.issue-title", doc) ??
			getText(".title.issue-title", doc) ??
			getMeta(doc, "og:title", "property");

		// State / status badge
		const stateBadge = getText(".badge.badge-pill", doc) ?? getText(".issuable-status-badge", doc);

		// Body
		const bodyEl =
			(selectOne(".description .wiki .content", doc) as Element | null) ??
			(selectOne(".description .md-text", doc) as Element | null) ??
			(selectOne(".description", doc) as Element | null);
		const bodyText = bodyEl
			? nhm.translate(getInnerHTML(bodyEl)).replace(/\n{3,}/g, "\n\n").trim() || null
			: null;

		// Comments
		const commentEls = selectAll(".note-body .wiki", doc) as unknown as Element[];
		const comments: IssueComment[] = [];
		for (const el of commentEls.slice(0, 20)) {
			const md = nhm.translate(getInnerHTML(el)).replace(/\n{3,}/g, "\n\n").trim();
			if (md) comments.push({ author: null, body: md });
		}

		if (!issueTitle && !bodyText && comments.length === 0) {
			throw new Error("No GitLab content found");
		}

		return {
			type: "repo",
			title: pageTitle,
			url,
			platform: "gitlab",
			description: null,
			stars: null,
			forks: null,
			readmeContent: null,
			issue: {
				title: issueTitle ?? (pageTitle ?? ""),
				issueType: isMR ? "mr" : "issue",
				state: stateBadge,
				body: bodyText,
				comments,
			},
		};
	}

	// ── Repository page ───────────────────────────────────────────────────
	const jsonLdItems = extractJsonLd(doc);
	const repo = findByType(jsonLdItems, "SoftwareSourceCode");

	let description: string | null = null;
	let language: string | null = null;
	let repositoryUrl: string | null = null;

	if (repo) {
		description = stringVal(repo.description);
		const lang = repo.programmingLanguage;
		language = lang
			? typeof lang === "string"
				? lang
				: stringVal((lang as Record<string, unknown>).name)
			: null;
		repositoryUrl = stringVal(repo.codeRepository);
	} else {
		// og: meta fallback
		const ogDesc =
			getMeta(doc, "og:description", "property") ?? getMeta(doc, "description");
		description = ogDesc ?? null;
	}

	// README content — GitLab uses .markdown-body inside article.file-content
	const readmeEl =
		(selectOne("article.file-content .markdown-body", doc) as Element | null) ??
		(selectOne(".readme-holder .markdown-body", doc) as Element | null);
	const readmeRaw = readmeEl
		? nhm.translate(getInnerHTML(readmeEl)).replace(/\n{3,}/g, "\n\n").trim()
		: null;
	const readmeContent = readmeRaw && readmeRaw.length > 100 ? readmeRaw : null;

	// Star / fork counts
	const starRaw = getText(".star-count", doc) ?? getText('[data-testid="star-count"]', doc);
	const stars = starRaw ? starRaw.trim() : null;

	if (!description && !readmeContent && !stars && !language) {
		throw new Error("No GitLab content found");
	}

	return {
		type: "repo",
		title: pageTitle,
		url,
		platform: "gitlab",
		description,
		stars,
		forks: null,
		...(language ? { language } : {}),
		...(repositoryUrl ? { repositoryUrl } : {}),
		readmeContent,
		issue: null,
	};
}
