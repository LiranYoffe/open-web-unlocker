import { selectAll, selectOne } from "css-select";
import render from "dom-serializer";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import { NodeHtmlMarkdown } from "node-html-markdown";
import type { SocialComment, SocialData, SocialPost, SocialPostDetail } from "./page-data";

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

/** Get data-* attribute from an element directly (not via css-select). */
function dataAttr(el: Element, name: string): string | null {
	return getAttributeValue(el, `data-${name}`) ?? null;
}

/** Get a plain attribute value. */
function attr(el: Element, name: string): string | null {
	return getAttributeValue(el, name) ?? null;
}

/** Parse an ISO timestamp string into a YYYY-MM-DD date string, or null. */
function isoToDate(ts: string | null): string | null {
	if (!ts) return null;
	const date = new Date(ts);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}

export function parseReddit(html: string, url: string): SocialData {
	const doc = parseDocument(html);
	const title = extractTitle(doc);

	const parsedUrl = new URL(url);
	const isPostPage = /\/comments\//.test(parsedUrl.pathname);

	if (isPostPage) {
		// ── Single post page ─────────────────────────────────────────────────────

		// Old Reddit post page: .sitetable > .thing with data-* attributes
		const postThing = selectOne("#siteTable .thing", doc) as Element | null;

		let postDetail: SocialPostDetail | null = null;

		if (postThing) {
			// Title from .title a.title
			const titleEl = selectOne(".title > a.title", postThing) as Element | null;
			const postTitle = titleEl ? textContent(titleEl).trim() : null;
			const postHref = titleEl ? (getAttributeValue(titleEl, "href") ?? "") : "";
			const isLinkPost = postHref.startsWith("http");
			const externalUrl = isLinkPost ? postHref : null;

			// Metadata from data-* attributes
			const score = dataAttr(postThing, "score");
			const author = dataAttr(postThing, "author");
			const domain = dataAttr(postThing, "domain");
			const subreddit = dataAttr(postThing, "subreddit-prefixed");
			const commentCount = dataAttr(postThing, "comments-count");
			const timestamp = dataAttr(postThing, "timestamp");

			let dateStr: string | null = null;
			if (timestamp) {
				const date = new Date(Number(timestamp));
				if (!Number.isNaN(date.getTime())) {
					dateStr = date.toISOString().split("T")[0] ?? null;
				}
			}

			// Post body
			const articleBody = selectOne('[property="schema:articleBody"]', doc) as Element | null;
			let bodyText: string | null = null;
			if (articleBody) {
				const md = nhm.translate(getInnerHTML(articleBody));
				bodyText = md.replace(/\n{3,}/g, "\n\n").trim() || null;
			} else {
				const oldBody =
					(selectOne(".expando .usertext-body .md", doc) as Element | null) ||
					(selectOne("[data-post-click-location='text-body']", doc) as Element | null) ||
					(selectOne("[slot='text-body']", doc) as Element | null);
				if (oldBody) {
					const md = nhm.translate(getInnerHTML(oldBody));
					bodyText = md.replace(/\n{3,}/g, "\n\n").trim() || null;
				}
			}

			postDetail = {
				title: postTitle ?? (title ?? ""),
				url: externalUrl,
				score,
				body: bodyText,
				author,
				subreddit: subreddit ? subreddit.replace(/^r\//, "") : null,
				domain: domain && !domain.startsWith("self.") ? domain : null,
				commentCount,
				date: dateStr,
			};
		} else {
			// New Reddit: shreddit-post custom element with metadata attributes
			const shredditPost = selectOne("shreddit-post", doc) as Element | null;

			if (shredditPost) {
				const postTitle = attr(shredditPost, "post-title");
				const contentHref = attr(shredditPost, "content-href");
				const isLinkPost = shredditPost.attribs.hasOwnProperty("is-link-post");
				const domain = attr(shredditPost, "domain");
				const subreddit = attr(shredditPost, "subreddit-prefixed-name");

				// Post body (self-posts)
				const bodyEl =
					(selectOne("[slot='text-body']", shredditPost) as Element | null) ??
					(selectOne("[data-post-click-location='text-body']", shredditPost) as Element | null) ??
					(selectOne(".md", shredditPost) as Element | null);
				let bodyText: string | null = null;
				if (bodyEl) {
					const md = nhm.translate(getInnerHTML(bodyEl));
					bodyText = md.replace(/\n{3,}/g, "\n\n").trim() || null;
				}

				postDetail = {
					title: postTitle ?? (title ?? ""),
					url: isLinkPost && contentHref ? contentHref : null,
					score: attr(shredditPost, "score"),
					body: bodyText,
					author: attr(shredditPost, "author"),
					subreddit: subreddit ? subreddit.replace(/^r\//, "") : null,
					domain: domain && !domain.startsWith("self.") ? domain : null,
					commentCount: attr(shredditPost, "comment-count"),
					date: isoToDate(attr(shredditPost, "created-timestamp")),
				};
			} else {
				// Fallback: try h1 or a.title
				const h1 = selectOne("h1", doc) as Element | null;
				const oldTitleEl = selectOne("a.title", doc) as Element | null;
				const postTitleEl = h1 ?? oldTitleEl;
				const postTitle = postTitleEl ? textContent(postTitleEl).trim() : null;

				if (postTitle) {
					postDetail = {
						title: postTitle,
						url: null,
						score: null,
						body: null,
						author: null,
						subreddit: null,
						domain: null,
						commentCount: null,
						date: null,
					};
				}
			}
		}

		// Comments: old Reddit uses .comment .usertext-body .md
		const oldComments = selectAll(".comment .usertext-body .md", doc) as unknown as Element[];
		const comments: SocialComment[] = [];
		for (const comment of oldComments.slice(0, 10)) {
			const commentDiv = comment.parent?.parent as Element | null;
			const authorEl = commentDiv
				? (selectOne(".author", commentDiv) as Element | null)
				: null;
			const commentAuthor = authorEl ? textContent(authorEl).trim() : null;
			const scoreEl = commentDiv
				? (selectOne(".score.unvoted", commentDiv) as Element | null)
				: null;
			const commentScore = scoreEl
				? (getAttributeValue(scoreEl, "title") ?? null)
				: null;

			const md = nhm.translate(getInnerHTML(comment));
			const cleaned = md.replace(/\n{3,}/g, "\n\n").trim();
			if (cleaned) {
				comments.push({
					author: commentAuthor,
					score: commentScore,
					body: cleaned,
				});
			}
		}

		// New Reddit: shreddit-comment custom elements (top-level only)
		if (comments.length === 0) {
			const shredditComments = selectAll("shreddit-comment", doc) as unknown as Element[];
			for (const sc of shredditComments) {
				if (comments.length >= 10) break;
				// Only top-level comments (depth=0)
				if (attr(sc, "depth") !== "0") continue;

				const bodyEl = selectOne(".md", sc) as Element | null;
				if (!bodyEl) continue;

				const md = nhm.translate(getInnerHTML(bodyEl));
				const cleaned = md.replace(/\n{3,}/g, "\n\n").trim();
				if (cleaned) {
					comments.push({
						author: attr(sc, "author"),
						score: attr(sc, "score"),
						body: cleaned,
					});
				}
			}
		}

		if (!postDetail && comments.length === 0) {
			throw new Error("No Reddit-specific content found");
		}

		return {
			type: "social",
			title,
			url,
			platform: "reddit",
			sectionTitle: null,
			description: null,
			posts: [],
			post: postDetail,
			comments,
		};
	}

	// ── Subreddit listing or profile ──────────────────────────────────────────

	// Subreddit name: Old Reddit titlebox h1, New Reddit shreddit-subreddit-header
	const subredditHeader = selectOne("shreddit-subreddit-header", doc) as Element | null;
	const subredditName =
		getText(".titlebox h1", doc) ??
		(subredditHeader ? attr(subredditHeader, "prefixed-name") : null) ??
		getText("h1", doc);
	const sectionTitle = subredditName ? subredditName.replace(/^r\//, "") : null;

	// Subreddit description: Old Reddit sidebar, New Reddit header description attribute
	const descEl = selectOne(".titlebox .usertext-body .md", doc) as Element | null;
	const description = descEl
		? nhm.translate(getInnerHTML(descEl)).replace(/\n{3,}/g, "\n\n").trim() || null
		: (subredditHeader ? attr(subredditHeader, "description") : null);

	// Old Reddit listing: .thing divs in #siteTable
	const thingEls = selectAll("#siteTable .thing", doc) as unknown as Element[];
	const posts: SocialPost[] = [];

	if (thingEls.length > 0) {
		for (const thing of thingEls.slice(0, 25)) {
			const isPromoted = dataAttr(thing, "promoted");
			if (isPromoted === "true") continue;

			const titleEl = selectOne(".title > a.title", thing) as Element | null;
			if (!titleEl) continue;

			const postTitle = textContent(titleEl).trim();
			const postHref = getAttributeValue(titleEl, "href") ?? "";
			const postUrl = postHref.startsWith("http")
				? postHref
				: postHref
					? `https://old.reddit.com${postHref}`
					: "";

			const score = dataAttr(thing, "score");
			const author = dataAttr(thing, "author");
			const domain = dataAttr(thing, "domain");
			const commentCount = dataAttr(thing, "comments-count");
			const timestamp = dataAttr(thing, "timestamp");
			const isSticky = thing.attribs?.class?.includes("stickied") ?? false;

			let dateStr: string | null = null;
			if (timestamp) {
				const date = new Date(Number(timestamp));
				if (!Number.isNaN(date.getTime())) {
					dateStr = date.toISOString().slice(0, 10);
				}
			}

			if (postTitle && postUrl) {
				posts.push({
					title: postTitle,
					url: postUrl,
					score,
					author,
					date: dateStr,
					comments: commentCount,
					domain: domain && !domain.startsWith("self.") ? domain : null,
					isSticky,
				});
			}
		}
	} else {
		// New Reddit: shreddit-post custom elements with metadata attributes
		const shredditPosts = selectAll("shreddit-post", doc) as unknown as Element[];
		for (const sp of shredditPosts.slice(0, 25)) {
			const postTitle = attr(sp, "post-title");
			if (!postTitle) continue;

			// Build URL: prefer permalink for Reddit-internal links
			const permalink = attr(sp, "permalink") ?? "";
			const postUrl = permalink
				? `https://www.reddit.com${permalink}`
				: "";
			if (!postUrl) continue;

			const domain = attr(sp, "domain");

			posts.push({
				title: postTitle,
				url: postUrl,
				score: attr(sp, "score"),
				author: attr(sp, "author"),
				date: isoToDate(attr(sp, "created-timestamp")),
				comments: attr(sp, "comment-count"),
				domain: domain && !domain.startsWith("self.") ? domain : null,
				isSticky: false,
			});
		}
	}

	if (!sectionTitle && !description && posts.length === 0) {
		throw new Error("No Reddit-specific content found");
	}

	return {
		type: "social",
		title,
		url,
		platform: "reddit",
		sectionTitle: sectionTitle ? `r/${sectionTitle}` : null,
		description,
		posts,
		post: null,
		comments: [],
	};
}
