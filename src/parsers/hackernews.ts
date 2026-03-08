import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { QaAnswer, QaData, SocialData, SocialPost } from "./page-data";

const nhm = new NodeHtmlMarkdown({
	bulletMarker: "-",
	codeBlockStyle: "fenced",
	ignore: ["script", "style", "noscript", "nav", "footer", "svg"],
});

function getInnerHTML(element: Element): string {
	return render(element.children);
}

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getText(selector: string, root: Document | Element): string | null {
	const el = selectOne(selector, root) as Element | null;
	return el ? textContent(el).trim() || null : null;
}

/** Resolve a relative HN URL to an absolute one. */
function resolveHnUrl(href: string): string {
	if (!href) return "";
	if (href.startsWith("http")) return href;
	return `https://news.ycombinator.com/${href.replace(/^\//, "")}`;
}

/**
 * Extract the comment count text from an <a> element whose href contains
 * "item?id=" and whose text contains "comment".
 * Returns e.g. "99 comments" or null.
 */
function extractCommentCount(sublineEl: Element): string | null {
	const links = selectAll("a", sublineEl) as unknown as Element[];
	for (const link of links) {
		const href = getAttributeValue(link, "href") ?? "";
		const text = textContent(link).trim();
		if (href.includes("item?id=") && text.includes("comment")) {
			return text;
		}
	}
	return null;
}

export function parseHackerNews(html: string, url: string): QaData | SocialData {
	const doc = parseDocument(html);
	const title = extractTitle(doc);

	// ── Single story / comment thread (has .fatitem) ───────────────────────────
	const fatItem = selectOne(".fatitem", doc) as Element | null;
	if (fatItem) {
		// Build the story block as question.text
		const storyParts: string[] = [];

		// Story title + link
		const titleLinkEl = selectOne(".titleline > a", fatItem) as Element | null;
		if (titleLinkEl) {
			const storyTitle = textContent(titleLinkEl).trim();
			const storyHref = getAttributeValue(titleLinkEl, "href") ?? "";
			const storyUrl = storyHref.startsWith("http") ? storyHref : resolveHnUrl(storyHref);
			storyParts.push(`# [${storyTitle}](${storyUrl})`);
		}

		// Source domain
		const siteStr = getText(".sitestr", fatItem);
		if (siteStr) storyParts.push(`**Source:** ${siteStr}`);

		// Score / points
		const scoreEl = selectOne(".score", fatItem) as Element | null;
		const scoreText = scoreEl ? textContent(scoreEl).trim() : null;
		let scoreNum: number | null = null;
		if (scoreText) {
			storyParts.push(`**Score:** ${scoreText}`);
			const m = scoreText.match(/\d+/);
			if (m) {
				const n = Number.parseInt(m[0], 10);
				if (!Number.isNaN(n)) scoreNum = n;
			}
		}

		// Submitted by / age
		const sublineEl = selectOne(".subline", fatItem) as Element | null;
		if (sublineEl) {
			const author = getText(".hnuser", sublineEl);
			const ageEl = selectOne(".age", sublineEl) as Element | null;
			const ageTitle = ageEl ? (getAttributeValue(ageEl, "title") ?? null) : null;
			const ageText = ageEl ? getText("a", ageEl) : null;
			const commentCount = extractCommentCount(sublineEl);
			if (author) storyParts.push(`**Submitted by:** ${author}`);
			if (ageTitle || ageText) {
				const when = ageTitle ? `${ageText ?? ""} (${ageTitle})` : (ageText ?? "");
				storyParts.push(`**Submitted:** ${when.trim()}`);
			}
			if (commentCount) storyParts.push(`**Comments:** ${commentCount}`);
		}

		// Ask HN / Show HN story body text
		const storyText = selectOne(".toptext", fatItem) as Element | null;
		if (storyText) {
			const md = nhm.translate(getInnerHTML(storyText));
			const cleaned = md.replace(/\n{3,}/g, "\n\n").trim();
			if (cleaned) storyParts.push(cleaned);
		}

		// If only comments were found (no story title), use the page title for context
		if (!storyParts.some((p) => p.startsWith("# "))) {
			const pageTitle = title ? title.replace(/\s*\|\s*Hacker News\s*$/, "").trim() : null;
			if (pageTitle) storyParts.unshift(`# ${pageTitle}`);
		}

		if (storyParts.length === 0) {
			throw new Error("No HackerNews-specific content found");
		}

		const questionText = storyParts.join("\n\n---\n\n");

		// Comments (up to 20)
		const commentEls = selectAll(".commtext", doc) as unknown as Element[];
		const answers: QaAnswer[] = [];
		for (const commentEl of commentEls.slice(0, 20)) {
			const commentRow = commentEl.parent as Element | null;
			const commentBlock = commentRow?.parent as Element | null;
			const authorEl = commentBlock
				? (selectOne(".hnuser", commentBlock) as Element | null)
				: null;
			const commentAuthor = authorEl ? textContent(authorEl).trim() : null;

			const md = nhm.translate(getInnerHTML(commentEl));
			const cleaned = md.replace(/\n{3,}/g, "\n\n").trim();
			if (cleaned) {
				const prefix = commentAuthor ? `**${commentAuthor}:** ` : "";
				answers.push({
					body: `${prefix}${cleaned}`,
					votes: null,
					isAccepted: false,
				});
			}
		}

		return {
			type: "qa",
			title: title ? title.replace(/\s*\|\s*Hacker News\s*$/, "").trim() : title,
			url,
			platform: "hackernews",
			question: {
				text: questionText,
				votes: scoreNum,
			},
			answers,
		};
	}

	// ── Front page / listing ────────────────────────────────────────────────────
	// Each story row is a `tr.athing.submission` with `id="{story_id}"`
	const storyRows = selectAll("tr.athing.submission", doc) as unknown as Element[];

	if (storyRows.length > 0) {
		const posts: SocialPost[] = [];

		for (const row of storyRows) {
			const storyId = getAttributeValue(row, "id") ?? "";

			// Title and URL
			const titleLineEl = selectOne(".titleline", row) as Element | null;
			if (!titleLineEl) continue;

			const linkEl = selectOne("a", titleLineEl) as Element | null;
			if (!linkEl) continue;

			const storyTitle = textContent(linkEl).trim();
			const rawHref = getAttributeValue(linkEl, "href") ?? "";
			const storyUrl = rawHref.startsWith("http") ? rawHref : resolveHnUrl(rawHref);

			// Source domain
			const siteStr = getText(".sitestr", titleLineEl);

			// Score, author, comment count, age
			let scoreText: string | null = null;
			let author: string | null = null;
			let commentCount: string | null = null;
			let ageText: string | null = null;

			if (storyId) {
				const scoreEl = selectOne(`#score_${storyId}`, doc) as Element | null;
				if (scoreEl) {
					scoreText = textContent(scoreEl).trim() || null;
					const sublineEl = scoreEl.parent as Element | null;
					if (sublineEl) {
						author = getText(".hnuser", sublineEl);
						const ageEl = selectOne(".age", sublineEl) as Element | null;
						ageText = ageEl ? getText("a", ageEl) : null;
						commentCount = extractCommentCount(sublineEl);
					}
				}
			}

			posts.push({
				title: storyTitle,
				url: storyUrl,
				score: scoreText,
				author,
				date: ageText,
				comments: commentCount,
				domain: siteStr,
				isSticky: false,
			});
		}

		if (posts.length === 0) {
			throw new Error("No HackerNews-specific content found");
		}

		return {
			type: "social",
			title: "Hacker News",
			url,
			platform: "hackernews",
			sectionTitle: "Hacker News",
			description: null,
			posts,
			post: null,
			comments: [],
		};
	}

	throw new Error("No HackerNews-specific content found");
}
