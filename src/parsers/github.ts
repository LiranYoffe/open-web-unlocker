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
	ignore: ["script", "style", "noscript", "nav", "footer", "svg"],
});

const GITHUB_NOISE = [
	"nav",
	"footer",
	".UnderlineNav",
	".js-sticky",
	".flash",
	".flash-warn",
	".js-comment-edit-button",
	".gh-header-actions",
	".file-actions",
	".js-permalink-shortcut",
	".comment-form-head",
	".comment-form-error",
	".CommentDivider-module__CommentDividerContainer__2DQ-S",
] as const;

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function cleanMarkdown(markdown: string): string {
	return markdown
		.replace(/\n{3,}/g, "\n\n")
		.replace(/^\s*You can.t perform that action at this time\.\s*$/gm, "")
		.replace(/^\s*Loading\s*$/gm, "")
		.replace(/^\s*## Sorry, something went wrong\.\s*$/gm, "")
		.replace(/^\s*###\s+Uh oh!\s*$/gm, "")
		.replace(/^\s*There was an error while loading\. Please reload this page\.\s*$/gm, "")
		.replace(/^\s*## No results found\s*$/gm, "")
		.replace(/^\s*Could not load (?:branches|tags)\s*$/gm, "")
		.replace(/^\s*Nothing to show\s*$/gm, "")
		.replace(/^\s*Choose a (?:base|head) ref\s*$/gm, "")
		.trim();
}

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

function getAttr(selector: string, attr: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? (getAttributeValue(el, attr) ?? null) : null;
}

function removeElement(el: Element): void {
	if (!el.parent) return;
	const idx = el.parent.children.indexOf(el);
	if (idx !== -1) el.parent.children.splice(idx, 1);
}

function stripNoise(root: Element, selectors: readonly string[]): void {
	for (const selector of selectors) {
		try {
			for (const el of selectAll(selector, root) as unknown as Element[]) {
				removeElement(el);
			}
		} catch {
			// ignore invalid selectors for this subtree
		}
	}
}

function markdownFromElement(element: Element, selectorsToRemove: readonly string[] = []): string | null {
	const cloned = parseDocument(render(element)) as unknown as Document;
	const root = selectOne("*", cloned) as Element | null;
	if (!root) return null;
	stripNoise(root, selectorsToRemove);
	const markdown = cleanMarkdown(nhm.translate(render(root)));
	return markdown || null;
}

function extractTopics(doc: Document): string[] {
	const metaEl = selectOne('meta[itemprop="keywords"]', doc) as Element | null;
	const metaContent = metaEl ? (getAttributeValue(metaEl, "content") ?? null) : null;
	if (metaContent) {
		const fromMeta = metaContent.split(",").map((t) => t.trim()).filter(Boolean);
		if (fromMeta.length > 0) return fromMeta;
	}

	const topicLinks = selectAll("a.topic-tag", doc) as unknown as Element[];
	return topicLinks
		.map((el) => textContent(el).trim())
		.filter(Boolean);
}

function extractPrimaryLanguage(doc: Document): string | null {
	const selectors = [
		'span[itemprop="programmingLanguage"]',
		'[data-testid="repository-language-stats"] li:first-child span:last-child',
		'a[href*="/search?l="] span.color-fg-default.text-bold',
	];

	for (const selector of selectors) {
		const value = getText(selector, doc);
		if (value) return value;
	}

	return null;
}

function extractRepositoryUrl(doc: Document, fallbackUrl: string): string | null {
	return (
		getAttr('meta[property="og:url"]', "content", doc) ??
		getAttr('link[rel="canonical"]', "href", doc) ??
		fallbackUrl
	);
}

function baseRepoData(doc: Document, url: string, title: string | null): Omit<RepoData, "readmeContent" | "issue"> {
	const description =
		getAttr('meta[name="description"]', "content", doc) ??
		getAttr('meta[property="og:description"]', "content", doc);
	const starsEl = selectOne("#repo-stars-counter-star", doc) as Element | null;
	const stars = starsEl
		? (getAttributeValue(starsEl, "title") || textContent(starsEl).trim() || null)
		: null;
	const forks = getText("#repo-network-counter", doc);
	const topics = extractTopics(doc);
	const language = extractPrimaryLanguage(doc);
	const repositoryUrl = extractRepositoryUrl(doc, url);

	return {
		type: "repo",
		title,
		url,
		platform: "github",
		description,
		stars,
		forks,
		...(topics.length > 0 ? { topics } : {}),
		...(language ? { language } : {}),
		...(repositoryUrl ? { repositoryUrl } : {}),
	};
}

function extractJsonLd(doc: Document): unknown[] {
	const scripts = selectAll('script[type="application/ld+json"]', doc) as unknown as Element[];
	const blocks: unknown[] = [];
	for (const script of scripts) {
		const raw = textContent(script).trim();
		if (!raw) continue;
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (Array.isArray(parsed)) blocks.push(...parsed);
			else blocks.push(parsed);
		} catch {
			// ignore invalid JSON-LD
		}
	}
	return blocks;
}

function findJsonLdType(items: unknown[], type: string): Record<string, unknown> | null {
	for (const item of items) {
		const obj = item as Record<string, unknown>;
		if (obj["@type"] === type) return obj;
		if (Array.isArray(obj["@graph"])) {
			const found = findJsonLdType(obj["@graph"] as unknown[], type);
			if (found) return found;
		}
	}
	return null;
}

function stringVal(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractDiscussionOrIssue(doc: Document, url: string, title: string | null): RepoData | null {
	const jsonLd = extractJsonLd(doc);
	const discussion = findJsonLdType(jsonLd, "DiscussionForumPosting");
	const issueTitle =
		stringVal(discussion?.headline) ??
		getText('[data-testid="issue-title"]', doc) ??
		getText("h1.gh-header-title bdi", doc);
	const articleBody = stringVal(discussion?.articleBody);
	const markdownBodies = selectAll('[data-testid="markdown-body"]', doc) as unknown as Element[];
	const [firstBody, ...restBodies] = markdownBodies;
	const bodyText = articleBody ??
		(firstBody ? cleanMarkdown(nhm.translate(getInnerHTML(firstBody))) || null : null);
	const comments: IssueComment[] = restBodies
		.map((body) => {
			const md = cleanMarkdown(nhm.translate(getInnerHTML(body)));
			if (!md) return null;
			return {
				author: null,
				body: md,
			};
		})
		.filter(Boolean) as IssueComment[];

	const state =
		getText('[data-testid="header-state"]', doc) ??
		(getText(".State", doc) ?? null);

	if (!issueTitle && !bodyText && comments.length === 0) {
		return null;
	}

	return {
		...baseRepoData(doc, url, title),
		readmeContent: null,
		issue: {
			title: issueTitle ?? title ?? "",
			issueType: null,
			state,
			body: bodyText,
			comments,
		},
	};
}

type CommitPayload = {
	payload?: {
		commit?: {
			oid?: string;
			authoredDate?: string;
			committedDate?: string;
			shortMessage?: string | null;
			shortMessageMarkdown?: string | null;
			bodyMessageHtml?: string | null;
			authors?: Array<{ login?: string; displayName?: string; profileName?: string }>;
			parents?: string[];
		};
		diffEntryData?: Array<{
			path?: string;
			linesAdded?: number;
			linesDeleted?: number;
			diffLines?: Array<{ type?: string; text?: string }>;
		}>;
	};
};

function extractEmbeddedCommitData(doc: Document): CommitPayload | null {
	const script = selectOne('script[data-target="react-app.embeddedData"]', doc) as Element | null;
	if (!script) return null;
	const raw = textContent(script).trim();
	if (!raw) return null;
	try {
		return JSON.parse(raw) as CommitPayload;
	} catch {
		return null;
	}
}

function extractTextFromHtmlFragment(fragment: string | null | undefined): string | null {
	if (!fragment) return null;
	const parsed = parseDocument(fragment);
	const text = textContent(parsed as unknown as any).trim();
	return text || null;
}

function extractCommit(doc: Document, url: string, title: string | null): RepoData | null {
	const embedded = extractEmbeddedCommitData(doc);
	const commit = embedded?.payload?.commit;
	if (!commit?.oid) return null;

	const message =
		stringVal(commit.shortMessage) ??
		extractTextFromHtmlFragment(commit.shortMessageMarkdown) ??
		getText(".CommitHeader-module__commitMessageContainer__Nj8bH", doc) ??
		`Commit ${commit.oid.slice(0, 7)}`;
	const author = commit.authors?.[0]?.displayName ?? commit.authors?.[0]?.profileName ?? commit.authors?.[0]?.login ?? null;
	const committedDate = commit.committedDate ?? commit.authoredDate ?? null;
	const releaseTag = getText('a[href*="/releases/tag/"]', doc);
	const diffEntries = embedded?.payload?.diffEntryData ?? [];

	const parts: string[] = [];
	parts.push(`# ${message}`);
	const meta: string[] = [];
	if (author) meta.push(author);
	if (committedDate) meta.push(committedDate);
	if (releaseTag) meta.push(releaseTag);
	if (commit.oid) meta.push(commit.oid);
	if (meta.length > 0) parts.push(meta.join(" · "));
	if (commit.parents && commit.parents.length > 0) {
		parts.push(`**Parents:** ${commit.parents.join(", ")}`);
	}
	if (diffEntries.length > 0) {
		parts.push(`## Files Changed`);
		for (const entry of diffEntries) {
			if (!entry.path) continue;
			parts.push(`### ${entry.path}`);
			const stats: string[] = [];
			if (typeof entry.linesAdded === "number") stats.push(`+${entry.linesAdded}`);
			if (typeof entry.linesDeleted === "number") stats.push(`-${entry.linesDeleted}`);
			if (stats.length > 0) parts.push(stats.join(" · "));

			const diffLines = (entry.diffLines ?? [])
				.filter((line) => line.text)
				.map((line) => line.text as string)
				.join("\n")
				.trim();
			if (diffLines) {
				parts.push(`\`\`\`diff\n${diffLines}\n\`\`\``);
			}
		}
	}

	return {
		...baseRepoData(doc, url, title),
		description: message,
		readmeContent: cleanMarkdown(parts.join("\n\n")),
		issue: null,
	};
}

function extractRepoContentPage(doc: Document, url: string, title: string | null): RepoData | null {
	const content =
		(selectOne("#repo-content-pjax-container .repository-content", doc) as Element | null) ??
		(selectOne("#repo-content-pjax-container", doc) as Element | null) ??
		(selectOne(".repository-content", doc) as Element | null);
	if (!content) return null;

	const markdown = markdownFromElement(content, GITHUB_NOISE);
	if (!markdown) return null;

	return {
		...baseRepoData(doc, url, title),
		readmeContent: markdown,
		issue: null,
	};
}

function extensionToLanguage(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase() ?? "";
	switch (ext) {
		case "js":
		case "mjs":
		case "cjs":
			return "javascript";
		case "ts":
		case "tsx":
			return "typescript";
		case "jsx":
			return "jsx";
		case "json":
			return "json";
		case "md":
			return "markdown";
		case "py":
			return "python";
		case "rb":
			return "ruby";
		case "sh":
			return "bash";
		case "yml":
		case "yaml":
			return "yaml";
		default:
			return ext;
	}
}

function extractGist(doc: Document, url: string, title: string | null): RepoData | null {
	const gistContent = selectOne(".gist-content", doc) as Element | null;
	if (!gistContent) return null;

	const files = (selectAll(".file", gistContent) as unknown as Element[])
		.map((file) => {
			const name = getText(".gist-blob-name", file);
			const rawUrl = getAttr('a[href*="/raw/"]', "href", file);
			const lines = (selectAll("td.blob-code-inner", file) as unknown as Element[])
				.map((line) => textContent(line))
				.join("\n")
				.trim();
			if (!name && !lines) return null;
			const lang = name ? extensionToLanguage(name) : "";
			const parts = [`## ${name ?? "snippet"}`];
			if (rawUrl) {
				parts.push(`**Raw:** https://gist.github.com${rawUrl}`);
			}
			if (lines) {
				parts.push(`\`\`\`${lang}\n${lines}\n\`\`\``);
			}
			return parts.join("\n\n");
		})
		.filter(Boolean) as string[];

	if (files.length === 0) return null;
	const gistLanguage = (() => {
		if (files.length !== 1) return null;
		const fileName = getText(".gist-blob-name", gistContent);
		return fileName ? extensionToLanguage(fileName) : null;
	})();
	const repositoryUrl = extractRepositoryUrl(doc, url);

	return {
		type: "repo",
		title,
		url,
		platform: "github",
		description: getText(".gist-content .gist-blob-name", doc),
		stars: null,
		forks: null,
		...(gistLanguage ? { language: gistLanguage } : {}),
		...(repositoryUrl ? { repositoryUrl } : {}),
		readmeContent: files.join("\n\n"),
		issue: null,
	};
}

export function parseGitHub(html: string, url: string): RepoData {
	const doc = parseDocument(html);
	const parsedUrl = new URL(url);
	const title = extractTitle(doc);
	const hostname = parsedUrl.hostname.replace(/^www\./, "");
	const path = parsedUrl.pathname;

	if (hostname === "gist.github.com") {
		const gist = extractGist(doc, url, title);
		if (gist) return gist;
		throw new Error("No public gist content found");
	}

	const readme =
		(selectOne("#readme .markdown-body", doc) as Element | null) ??
		(selectOne('article[itemprop="text"].markdown-body', doc) as Element | null) ??
		(selectOne('article[itemprop="text"]', doc) as Element | null);
	if (readme) {
		const repo = baseRepoData(doc, url, title);
		const readmeMd = cleanMarkdown(nhm.translate(getInnerHTML(readme))) || null;
		return {
			...repo,
			readmeContent: readmeMd,
			issue: null,
		};
	}

	if (/^\/[\w.-]+\/[\w.-]+\/(issues|pull|discussions)\//.test(path)) {
		const issueLike = extractDiscussionOrIssue(doc, url, title);
		if (issueLike) return issueLike;
	}

	if (/^\/[\w.-]+\/[\w.-]+\/commit\//.test(path)) {
		const commit = extractCommit(doc, url, title);
		if (commit) return commit;
	}

	if (/^\/[\w.-]+\/[\w.-]+\/(releases(?:\/tag)?|compare\/|tags(?:\/)?)/.test(path)) {
		const repoContentPage = extractRepoContentPage(doc, url, title);
		if (repoContentPage) return repoContentPage;
	}

	const markdownBody = selectOne(".markdown-body", doc) as Element | null;
	if (markdownBody) {
		return {
			...baseRepoData(doc, url, title),
			readmeContent: cleanMarkdown(nhm.translate(getInnerHTML(markdownBody))) || null,
			issue: null,
		};
	}

	const repoDesc =
		getText('[itemprop="about"]', doc) ??
		getAttr('meta[name="description"]', "content", doc);
	const topics = extractTopics(doc);
	if (repoDesc || topics.length > 0) {
		return {
			...baseRepoData(doc, url, title),
			description: repoDesc,
			topics,
			readmeContent: null,
			issue: null,
		};
	}

	throw new Error("No GitHub-specific content found");
}
