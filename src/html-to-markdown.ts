import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";

const MAX_STRIPPED_HTML_SIZE = 2 * 1024 * 1024; // 2MB

const NOISE_SELECTORS = [
	"[class*='cookie']",
	"[id*='cookie']",
	"[class*='gdpr']",
	"[class*='newsletter']",
	"[class*='subscribe-']",
	"[class*='-subscribe']",
	"[class*='advertisement']",
	"[id*='advertisement']",
	"[class*='social-share']",
	"[class*='share-buttons']",
	"[class*='share-bar']",
	"[class*='related-articles']",
	"[class*='more-stories']",
	"[class*='paywall']",
	"[id*='paywall']",
];

function removeNoiseElements(body: Element): void {
	for (const selector of NOISE_SELECTORS) {
		try {
			const elements = selectAll(selector, body) as Element[];
			for (const el of elements) {
				if (el.parent) {
					const idx = el.parent.children.indexOf(el);
					if (idx !== -1) {
						el.parent.children.splice(idx, 1);
					}
				}
			}
		} catch {
			// Skip if selector is unsupported by this DOM
		}
	}
}

function stripBloat(html: string): string {
	html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
	html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
	html = html.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");
	html = html.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");
	html = html.replace(/<!--[\s\S]*?-->/g, "");
	return html;
}

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function resolveUrl(relativeUrl: string, baseUrl: string): string {
	try {
		return new URL(relativeUrl, baseUrl).href;
	} catch {
		return relativeUrl;
	}
}

function resolveUrls(element: Element, baseUrl: string): void {
	const links = selectAll("a[href]", element) as Element[];
	for (const link of links) {
		const href = getAttributeValue(link, "href");
		if (href) {
			link.attribs.href = resolveUrl(href, baseUrl);
		}
	}

	const images = selectAll("img[src]", element) as Element[];
	for (const img of images) {
		const src = getAttributeValue(img, "src");
		if (src) {
			img.attribs.src = resolveUrl(src, baseUrl);
		}
	}
}

function extractTitle(doc: Document): string | null {
	const titleElement = selectOne("title", doc) as Element | null;
	if (titleElement) {
		const title = textContent(titleElement).trim();
		if (!title || title.toLowerCase() === "undefined") return null;
		return title;
	}
	return null;
}

function getBody(doc: Document): Element | null {
	return selectOne("body", doc) as Element | null;
}

export interface ExtractResult {
	markdown: string;
	title: string | null;
}

export function extractMarkdown(html: string, url: string): ExtractResult {
	if (!html || html.trim().length === 0) {
		return { markdown: "", title: null };
	}

	const strippedHtml = stripBloat(html);

	if (strippedHtml.length > MAX_STRIPPED_HTML_SIZE) {
		throw new Error(
			`Content too large: ${(strippedHtml.length / 1024 / 1024).toFixed(1)}MB after stripping exceeds ${MAX_STRIPPED_HTML_SIZE / 1024 / 1024}MB limit`,
		);
	}

	const doc = parseDocument(strippedHtml);
	const title = extractTitle(doc);

	const body = getBody(doc);
	if (!body) {
		return { markdown: "", title };
	}
	removeNoiseElements(body);
	resolveUrls(body, url);
	const contentHtml = getInnerHTML(body);

	const nhm = new NodeHtmlMarkdown({
		bulletMarker: "-",
		codeBlockStyle: "fenced",
		ignore: ["script", "style", "noscript", "nav", "footer", "header", "aside"],
	});

	let markdown = nhm.translate(contentHtml);
	markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

	return { markdown, title };
}
