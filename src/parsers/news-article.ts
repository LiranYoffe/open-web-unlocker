import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { ArticleData } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "aside", "svg"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMetaContent(doc: Document, name: string, attr = "name"): string | null {
	const el = selectOne(`meta[${attr}="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function removeElements(parent: Element, selectors: string[]): void {
	for (const selector of selectors) {
		try {
			const elements = selectAll(selector, parent) as unknown as Element[];
			for (const el of elements) {
				if (el.parent) {
					const idx = el.parent.children.indexOf(el);
					if (idx !== -1) {
						el.parent.children.splice(idx, 1);
					}
				}
			}
		} catch {
			// Skip unsupported selectors
		}
	}
}

const NOISE_SELECTORS = [
	"[id='disqus_thread']",
	"[id='cookie-banner']",
	"[id='gdpr-banner']",
	"[id='newsletter-signup']",
	// Remove common noise within article containers
	"footer",
	"aside",
	"nav",
	"[aria-label='Advertisement']",
	"[data-type='RelatedStory']",
	"[data-type='RelatedContent']",
];

const CONTENT_SELECTORS = [
	'[itemprop="articleBody"]',
	"article",
	".article-content",
	".story-body",
	".entry-content",
	".article__body",
	".post-content",
	".article-body",
	".body-text",
	".article__content",
	".story-content",
	".news-article",
	".content-body",
	// Removed: [class*='article-body'] and [class*='story-body'] — too broad
];

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
			// Ignore invalid JSON
		}
	}
	return results;
}

function extractNextData(doc: Document): Record<string, unknown> | null {
	const nextDataEl = selectOne('script[id="__NEXT_DATA__"]', doc) as Element | null;
	if (!nextDataEl) return null;
	const raw = textContent(nextDataEl).trim();
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function findStructuredArticleNode(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object") return null;
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = findStructuredArticleNode(item);
			if (found) return found;
		}
		return null;
	}

	const obj = value as Record<string, unknown>;
	if (
		(obj.type === "article" && Array.isArray(obj.content)) ||
		Array.isArray(obj.contents)
	) {
		return obj;
	}

	for (const nested of Object.values(obj)) {
		const found = findStructuredArticleNode(nested);
		if (found) return found;
	}
	return null;
}

function hasNotFoundMarker(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;
	if (Array.isArray(value)) return value.some((item) => hasNotFoundMarker(item));

	const obj = value as Record<string, unknown>;
	if (
		obj.type === "notFoundPage" ||
		obj.page === "error" ||
		obj.content_type === "nonContentPage"
	) {
		return true;
	}

	return Object.values(obj).some((nested) => hasNotFoundMarker(nested));
}

function extractTextFromRichBlock(value: unknown): string {
	if (!value || typeof value !== "object") return "";
	if (Array.isArray(value)) {
		return value
			.map((item) => extractTextFromRichBlock(item))
			.filter(Boolean)
			.join("");
	}

	const obj = value as Record<string, unknown>;
	if (typeof obj.text === "string" && obj.text.trim()) {
		return obj.text.trim();
	}
	if (obj.model && typeof obj.model === "object") {
		return extractTextFromRichBlock(obj.model);
	}
	if (Array.isArray(obj.blocks)) {
		const parts = obj.blocks
			.map((block) => extractTextFromRichBlock(block))
			.filter(Boolean);
		return parts.join("");
	}
	return "";
}

function extractStructuredArticleContent(node: Record<string, unknown>): string | null {
	const content = node.content ?? node.contents;
	if (!Array.isArray(content)) return null;

	const sections: string[] = [];

	for (const item of content) {
		if (!item || typeof item !== "object") continue;
		const block = item as Record<string, unknown>;
		const blockType = typeof block.type === "string" ? block.type : "";

		if (blockType === "advertisement" || blockType === "links") {
			continue;
		}

		if (blockType === "text" || blockType === "subheadline") {
			const text = extractTextFromRichBlock((block.model as Record<string, unknown> | undefined)?.blocks);
			if (text) sections.push(text);
			continue;
		}

		if (blockType === "image") {
			const model = block.model as Record<string, unknown> | undefined;
			const blocks = Array.isArray(model?.blocks) ? model.blocks : [];
			const captionBlock = blocks.find((entry) => {
				if (!entry || typeof entry !== "object") return false;
				return (entry as Record<string, unknown>).type === "caption";
			});
			const caption = extractTextFromRichBlock(captionBlock);
			if (caption) sections.push(caption);
		}
	}

	return sections.length > 0 ? sections.join("\n\n") : null;
}

interface ArticleJsonLd {
	headline?: string;
	articleBody?: string;
	author?: string;
	datePublished?: string;
}

function findArticleJsonLd(items: unknown[]): ArticleJsonLd | null {
	const articleTypes = new Set([
		"Article",
		"NewsArticle",
		"ReportageNewsArticle",
		"AnalysisNewsArticle",
		"BlogPosting",
	]);

	for (const item of items) {
		const obj = item as Record<string, unknown>;
		const type = obj["@type"];

		if (typeof type === "string" && articleTypes.has(type)) {
			const headline = typeof obj.headline === "string" ? obj.headline : undefined;
			const articleBody = typeof obj.articleBody === "string" ? obj.articleBody : undefined;
			const datePublished = typeof obj.datePublished === "string" ? obj.datePublished : undefined;

			// Extract author name
			let author: string | undefined;
			if (typeof obj.author === "string") {
				author = obj.author;
			} else if (obj.author && typeof obj.author === "object") {
				const a = obj.author as Record<string, unknown>;
				if (typeof a.name === "string") author = a.name;
			} else if (Array.isArray(obj.author)) {
				const names = (obj.author as unknown[])
					.map((a) => {
						const ao = a as Record<string, unknown>;
						return typeof ao.name === "string" ? ao.name : null;
					})
					.filter(Boolean) as string[];
				if (names.length > 0) author = names.join(", ");
			}

			if (headline || articleBody) {
				return { headline, articleBody, author, datePublished };
			}
		}

		// Check @graph array
		if (Array.isArray(obj["@graph"])) {
			const result = findArticleJsonLd(obj["@graph"] as unknown[]);
			if (result) return result;
		}
	}
	return null;
}

/** Extract author from DOM using stable itemprop / semantic attributes */
function extractAuthorFromDom(doc: Document): string | null {
	const authorEl = selectOne('[itemprop="author"]', doc) as Element | null;
	if (authorEl) {
		const name = textContent(authorEl).trim();
		if (name) return name;
	}
	const relAuthor = selectOne('a[rel="author"]', doc) as Element | null;
	if (relAuthor) {
		const name = textContent(relAuthor).trim();
		if (name) return name;
	}
	return null;
}

function extractAuthorFromMeta(doc: Document): string | null {
	const raw =
		getMetaContent(doc, "author") ??
		getMetaContent(doc, "author", "property") ??
		getMetaContent(doc, "cXenseParse:author") ??
		getMetaContent(doc, "cXenseParse:author", "property");
	if (!raw) return null;
	return raw.replace(/\s*\|\s*/g, ", ").trim() || null;
}

/** Extract publication date from DOM */
function extractDateFromDom(doc: Document): string | null {
	const dateEl = selectOne('[itemprop="datePublished"]', doc) as Element | null;
	if (dateEl) {
		const datetime = getAttributeValue(dateEl, "datetime") ?? textContent(dateEl).trim();
		if (datetime) return datetime;
	}
	const timeEl = selectOne("time[datetime]", doc) as Element | null;
	if (timeEl) {
		const dt = getAttributeValue(timeEl, "datetime");
		if (dt) return dt;
	}
	return null;
}

export function parseNewsArticle(html: string, url: string): ArticleData {
	const doc = parseDocument(html);
	const title = extractTitle(doc);
	const nextData = extractNextData(doc);
	if (nextData && hasNotFoundMarker(nextData)) {
		throw new Error("Article page not found");
	}

	// 1. Try JSON-LD (most reliable for clean structured data + metadata)
	const jsonLdItems = extractJsonLd(doc);
	const articleData = findArticleJsonLd(jsonLdItems);
	const nextArticle = nextData ? findStructuredArticleNode(nextData) : null;
	const nextContent = nextArticle ? extractStructuredArticleContent(nextArticle) : null;
	const metaAuthor = extractAuthorFromMeta(doc);
	if (articleData?.articleBody && articleData.articleBody.length > 30) {
		const headline = articleData.headline || title;
		const author = articleData.author ?? metaAuthor ?? extractAuthorFromDom(doc);
		const datePublished = articleData.datePublished ?? extractDateFromDom(doc);
		const content = articleData.articleBody
			.replace(/\r\n/g, "\n")
			.replace(/\n{2,}/g, "\n\n")
			.trim();
		return {
			type: "article",
			title: headline || title,
			url,
			headline: headline ?? null,
			author: author ?? null,
			datePublished: datePublished ?? null,
			content,
		};
	}

	if (nextContent && nextContent.length > 200) {
		return {
			type: "article",
			title: articleData?.headline ?? title,
			url,
			headline: articleData?.headline ?? title,
			author: articleData?.author ?? metaAuthor ?? extractAuthorFromDom(doc),
			datePublished:
				articleData?.datePublished ??
				getMetaContent(doc, "article:modified_time", "property") ??
				extractDateFromDom(doc),
			content: nextContent,
		};
	}

	// 2. Extract author/date from DOM even when body comes from HTML selectors
	const domAuthor = metaAuthor ?? extractAuthorFromDom(doc);
	const domDate = extractDateFromDom(doc);

	// 3. Try structural content selectors
	for (const selector of CONTENT_SELECTORS) {
		try {
			const el = selectOne(selector, doc) as Element | null;
			if (!el) continue;
			removeElements(el, NOISE_SELECTORS);
			const md = nhm.translate(getInnerHTML(el));
			const trimmed = md.replace(/\n{3,}/g, "\n\n").trim();
			if (trimmed.length > 100) {
				return {
					type: "article",
					title,
					url,
					headline: title,
					author: domAuthor,
					datePublished: domDate,
					content: trimmed,
				};
			}
		} catch {
			// Skip and try next
		}
	}

	// 4. Try og: meta as last resort
	const ogDesc = selectOne('meta[property="og:description"]', doc) as Element | null;
	const ogTitle = selectOne('meta[property="og:title"]', doc) as Element | null;
	const ogTitleText = ogTitle ? (getAttributeValue(ogTitle, "content") ?? null) : null;
	const ogDescText = ogDesc ? (getAttributeValue(ogDesc, "content") ?? null) : null;
	if (ogTitleText || ogDescText) {
		return {
			type: "article",
			title: ogTitleText || title,
			url,
			headline: ogTitleText,
			author: domAuthor,
			datePublished: domDate,
			content: ogDescText ?? "",
		};
	}

	throw new Error("No news article content found");
}
