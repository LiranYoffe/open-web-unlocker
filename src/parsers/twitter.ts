import { selectAll, selectOne } from "css-select";
import type { Document, Element } from "domhandler";
import { getAttributeValue, textContent } from "domutils";
import { parseDocument } from "htmlparser2";
import type { SocialComment, SocialData, SocialPost } from "./page-data";

function extractTitle(doc: Document): string | null {
	const titleEl = selectOne("title", doc) as Element | null;
	return titleEl ? textContent(titleEl).trim() || null : null;
}

function getMeta(doc: Document, property: string): string | null {
	const el = selectOne(`meta[property="${property}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

function getMetaName(doc: Document, name: string): string | null {
	const el = selectOne(`meta[name="${name}"]`, doc) as Element | null;
	return el ? (getAttributeValue(el, "content") ?? null) : null;
}

/** Extract JSON-LD ProfilePage schema embedded in the page by X's SSR. */
function extractProfileSchema(doc: Document): Record<string, unknown> | null {
	const scriptEl = selectOne(
		'script[data-testid="UserProfileSchema-test"]',
		doc,
	) as Element | null;
	if (!scriptEl) return null;
	try {
		return JSON.parse(textContent(scriptEl)) as Record<string, unknown>;
	} catch {
		return null;
	}
}

/** Format a large number to a human-readable string (e.g. 235474097 -> "235.5M"). */
function formatCount(n: number): string {
	if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
	return n.toLocaleString("en-US");
}

/** Look up an InteractionCounter by name from JSON-LD interactionStatistic array. */
function getStatCount(
	stats: unknown[],
	name: string,
): number | null {
	for (const stat of stats) {
		if (
			typeof stat === "object" &&
			stat !== null &&
			(stat as Record<string, unknown>).name === name
		) {
			const count = (stat as Record<string, unknown>).userInteractionCount;
			if (typeof count === "number") return count;
		}
	}
	return null;
}

/** Extract the display name from the UserName data-testid element. */
function extractDisplayName(doc: Document): string | null {
	const nameEl = selectOne('[data-testid="UserName"]', doc) as Element | null;
	if (!nameEl) return null;
	// The first nested span with text is the display name
	const spans = selectAll("span", nameEl) as unknown as Element[];
	for (const span of spans) {
		const text = textContent(span).trim();
		// Skip @handle and empty spans
		if (text && !text.startsWith("@")) return text;
	}
	return null;
}

/** Extract user bio from the UserDescription data-testid element when present. */
function extractBioFromDom(doc: Document): string | null {
	const bioEl = selectOne('[data-testid="UserDescription"]', doc) as Element | null;
	if (!bioEl) return null;
	const text = textContent(bioEl).trim();
	return text || null;
}

/** Extract the join date from UserJoinDate data-testid element. */
function extractJoinDate(doc: Document): string | null {
	const el = selectOne('[data-testid="UserJoinDate"]', doc) as Element | null;
	if (!el) return null;
	const text = textContent(el).trim();
	// Text is like "Joined June 2009"
	return text.replace(/^Joined\s+/i, "").trim() || null;
}

interface TweetInfo {
	author: string | null;
	text: string;
	date: string | null;
	permalink: string | null;
	metrics: string | null; // e.g. "169K replies, 756K reposts, 4.3M likes"
	tweetId: string | null;
	mediaUrls: string[];
	quotedPost: { author: string | null; text: string; url: string | null } | null;
	isVerified: boolean;
}

/** Extract structured tweet info from a tweet article element. */
function extractTweetInfo(tweet: Element): TweetInfo | null {
	const tweetTextEl = selectOne('[data-testid="tweetText"]', tweet) as Element | null;
	if (!tweetTextEl) return null;
	const text = textContent(tweetTextEl).trim();
	if (!text) return null;

	// Author from User-Name
	let author: string | null = null;
	const userNameEl = selectOne('[data-testid="User-Name"]', tweet) as Element | null;
	if (userNameEl) {
		const spans = selectAll("span", userNameEl) as unknown as Element[];
		for (const span of spans) {
			const t = textContent(span).trim();
			if (t && !t.startsWith("@") && t.length > 1) {
				author = t;
				break;
			}
		}
	}

	// Date from <time> element
	let date: string | null = null;
	const timeEl = selectOne("time", tweet) as Element | null;
	if (timeEl) {
		date = getAttributeValue(timeEl, "datetime") ?? null;
	}

	// Permalink from status link
	let permalink: string | null = null;
	const links = selectAll("a", tweet) as unknown as Element[];
	for (const link of links) {
		const href = getAttributeValue(link, "href");
		if (href && /^\/[^/]+\/status\/\d+$/.test(href)) {
			permalink = `https://x.com${href}`;
			break;
		}
	}

	// Engagement metrics from the first combined aria-label (e.g. "169095 replies, 756475 reposts, 4256916 likes, 21536 bookmarks")
	let metrics: string | null = null;
	const allEls = selectAll("[aria-label]", tweet) as unknown as Element[];
	for (const el of allEls) {
		const label = getAttributeValue(el, "aria-label") ?? "";
		if (/\d+\s+repl/i.test(label) && /\d+\s+like/i.test(label)) {
			metrics = label;
			break;
		}
	}

	// Tweet ID from permalink
	let tweetId: string | null = null;
	if (permalink) {
		const idMatch = permalink.match(/\/status\/(\d+)/);
		tweetId = idMatch?.[1] ?? null;
	}

	// Media URLs (photos/videos)
	// Try <img> sources first, fall back to photo link hrefs (images may be blocked in browser)
	const mediaUrls: string[] = [];
	const imgs = selectAll("img", tweet) as unknown as Element[];
	for (const img of imgs) {
		const src = getAttributeValue(img, "src") ?? "";
		if (src.includes("pbs.twimg.com/media")) {
			mediaUrls.push(src);
		}
	}
	if (mediaUrls.length === 0) {
		const photoLinks = selectAll('a[href*="/photo/"]', tweet) as unknown as Element[];
		for (const link of photoLinks) {
			const href = getAttributeValue(link, "href") ?? "";
			if (href && permalink) {
				mediaUrls.push(`https://x.com${href}`);
			}
		}
	}

	// Quoted tweet
	let quotedPost: TweetInfo["quotedPost"] = null;
	const quotedEl = selectOne('[data-testid="quotedTweet"]', tweet) as Element | null;
	if (quotedEl) {
		const quotedTextEl = selectOne('[data-testid="tweetText"]', quotedEl) as Element | null;
		const quotedText = quotedTextEl ? textContent(quotedTextEl).trim() : "";
		let quotedAuthor: string | null = null;
		const quotedUserEl = selectOne('[data-testid="User-Name"]', quotedEl) as Element | null;
		if (quotedUserEl) {
			const qSpans = selectAll("span", quotedUserEl) as unknown as Element[];
			for (const span of qSpans) {
				const t = textContent(span).trim();
				if (t && !t.startsWith("@") && t.length > 1) { quotedAuthor = t; break; }
			}
		}
		let quotedUrl: string | null = null;
		const qLinks = selectAll("a", quotedEl) as unknown as Element[];
		for (const link of qLinks) {
			const href = getAttributeValue(link, "href");
			if (href && /^\/[^/]+\/status\/\d+$/.test(href)) {
				quotedUrl = `https://x.com${href}`;
				break;
			}
		}
		if (quotedText) {
			quotedPost = { author: quotedAuthor, text: quotedText, url: quotedUrl };
		}
	}

	// Verification badge
	let isVerified = false;
	if (userNameEl) {
		const verifiedEl = selectOne('[data-testid="icon-verified"]', userNameEl) as Element | null;
		if (verifiedEl) {
			isVerified = true;
		} else {
			const svgs = selectAll("svg", userNameEl) as unknown as Element[];
			isVerified = svgs.some(svg => {
				const ariaLabel = getAttributeValue(svg, "aria-label") ?? "";
				return ariaLabel.includes("Verified");
			});
		}
	}

	return { author, text, date, permalink, metrics, tweetId, mediaUrls, quotedPost, isVerified };
}

/** Determine if the URL looks like a profile page (not a specific tweet/status). */
function isProfileUrl(url: string): boolean {
	try {
		const { pathname } = new URL(url);
		// Profile: /, /username, /username/ (no /status/ segment)
		return !pathname.includes("/status/");
	} catch {
		return false;
	}
}

export function parseTwitter(html: string, url: string): SocialData {
	const doc = parseDocument(html);
	const pageTitle = extractTitle(doc);

	const ogTitle = getMeta(doc, "og:title");
	const ogDesc = getMeta(doc, "og:description");
	const twitterTitle = getMetaName(doc, "twitter:title");
	const twitterDesc = getMetaName(doc, "twitter:description");

	const effectiveTitle = ogTitle || twitterTitle;
	const effectiveDesc = ogDesc || twitterDesc;

	// ── JSON-LD profile schema ──────────────────────────────────────────
	const schema = extractProfileSchema(doc);
	const mainEntity =
		schema && typeof schema.mainEntity === "object" && schema.mainEntity !== null
			? (schema.mainEntity as Record<string, unknown>)
			: null;

	let profileName: string | null = null;
	let profileHandle: string | null = null;
	let profileBio: string | null = null;
	let profileFollowers: string | null = null;
	let profileFollowing: string | null = null;
	let profileTweetCount: string | null = null;
	let profileJoinDate: string | null = null;
	let profileLocation: string | null = null;

	// ── SSR meta tag extraction (for bot-UA responses) ──────────────────
	// X.com serves SSR meta tags to social bots (facebookexternalhit, Googlebot)
	// with profile data in og:title format: "Display Name (@handle) on X"
	const ogImage = getMeta(doc, "og:image");
	const metaDesc = getMetaName(doc, "description");

	if (!mainEntity && ogTitle && isProfileUrl(url)) {
		// Parse "Display Name (@handle) on X" from og:title
		const nameMatch = ogTitle.match(/^(.+?)\s+\(@(\w+)\)\s+on\s+X$/);
		if (nameMatch) {
			profileName = nameMatch[1] ?? null;
			profileHandle = `@${nameMatch[2]}`;
		}
		// Bio from meta description (same as og:description for profiles)
		profileBio = metaDesc || ogDesc || null;
	}

	if (mainEntity) {
		profileName = typeof mainEntity.name === "string" ? mainEntity.name : null;
		profileHandle =
			typeof mainEntity.additionalName === "string"
				? `@${mainEntity.additionalName}`
				: null;

		// Bio: prefer DOM (may have links/emoji), fall back to JSON-LD
		const domBio = extractBioFromDom(doc);
		const schemaBio =
			typeof mainEntity.description === "string" && mainEntity.description
				? mainEntity.description
				: null;
		profileBio = domBio || schemaBio;

		// Location from JSON-LD
		const homeLoc = mainEntity.homeLocation as Record<string, unknown> | undefined;
		if (homeLoc && typeof homeLoc.name === "string" && homeLoc.name) {
			profileLocation = homeLoc.name;
		}

		// Interaction stats
		const stats = Array.isArray(mainEntity.interactionStatistic)
			? mainEntity.interactionStatistic
			: [];
		const followCount = getStatCount(stats, "Follows");
		const friendCount = getStatCount(stats, "Friends");
		const tweetCount = getStatCount(stats, "Tweets");
		if (followCount !== null) profileFollowers = formatCount(followCount);
		if (friendCount !== null) profileFollowing = formatCount(friendCount);
		if (tweetCount !== null) profileTweetCount = formatCount(tweetCount);
	}

	// Join date: prefer DOM text, fall back to JSON-LD dateCreated
	profileJoinDate = extractJoinDate(doc);
	if (!profileJoinDate && schema) {
		const dateCreated = schema.dateCreated;
		if (typeof dateCreated === "string" && dateCreated) {
			// Parse ISO date to "Month YYYY" format
			const d = new Date(dateCreated);
			if (!Number.isNaN(d.getTime())) {
				profileJoinDate = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
			}
		}
	}

	// ── DOM: display name fallback ──────────────────────────────────────
	if (!profileName) {
		profileName = extractDisplayName(doc);
	}

	// ── Browser-rendered tweets ─────────────────────────────────────────
	const tweetEls = selectAll(
		'article[data-testid="tweet"]',
		doc,
	) as unknown as Element[];

	const posts: SocialPost[] = [];
	const comments: SocialComment[] = [];

	for (const tweet of tweetEls.slice(0, 20)) {
		const info = extractTweetInfo(tweet);
		if (!info) continue;

		// Populate posts array with structured data
		posts.push({
			title: info.text.length > 120 ? `${info.text.slice(0, 117)}...` : info.text,
			url: info.permalink ?? url,
			score: info.metrics,
			author: info.author,
			date: info.date,
			comments: null,
			domain: null,
			isSticky: false,
			tweetId: info.tweetId,
			mediaUrls: info.mediaUrls.length > 0 ? info.mediaUrls : undefined,
			quotedPost: info.quotedPost,
			isVerified: info.isVerified || undefined,
		});

		// Keep comments for backward-compat markdown rendering
		comments.push({ author: info.author, score: null, body: info.text });
	}

	// ── Build description ───────────────────────────────────────────────
	// For profile pages: combine bio + profile stats into a description string.
	// For tweet pages: use og:description as before.
	let description: string | null = null;
	const isProfile = isProfileUrl(url) && (mainEntity !== null || profileJoinDate !== null || profileName !== null);

	if (isProfile) {
		const descParts: string[] = [];
		if (profileBio) descParts.push(profileBio);
		const statParts: string[] = [];
		if (profileFollowers) statParts.push(`${profileFollowers} followers`);
		if (profileFollowing) statParts.push(`${profileFollowing} following`);
		if (profileTweetCount) statParts.push(`${profileTweetCount} posts`);
		if (profileJoinDate) statParts.push(`joined ${profileJoinDate}`);
		if (profileLocation) statParts.push(profileLocation);
		if (statParts.length > 0) descParts.push(statParts.join(" · "));
		description = descParts.length > 0 ? descParts.join("\n\n") : null;
	} else {
		description = effectiveDesc !== effectiveTitle ? effectiveDesc : null;
	}

	// ── Build title ─────────────────────────────────────────────────────
	let title: string | null = null;
	if (isProfile && profileName) {
		title = profileHandle ? `${profileName} (${profileHandle})` : profileName;
	} else {
		title = effectiveTitle || pageTitle;
	}

	// Detect error pages ("X / ?") and empty SSR responses
	const isErrorPage = pageTitle === "X / ?" || (title === " (@) on X" && !description);
	const bodyEl = selectOne("body", doc) as Element | null;
	const pageText = bodyEl ? textContent(bodyEl).replace(/\s+/g, " ").trim() : "";
	if (isErrorPage || (!title && !description && posts.length === 0 && comments.length === 0)) {
		throw new Error("No Twitter/X content found");
	}

	const hasLoginPrompt = Boolean(
		selectOne('[data-testid="login"], a[href="/login"], a[href="/i/flow/signup"]', doc),
	);
	const hasTimelineErrorText =
		/something went wrong\. try reloading\./i.test(pageText) ||
		/don.t miss what.s happening/i.test(pageText) ||
		/new to x\?/i.test(pageText) ||
		/people on x are the first to know/i.test(pageText);
	if (!isProfile && posts.length === 0 && (hasLoginPrompt || hasTimelineErrorText)) {
		throw new Error("X collection page is login-gated");
	}

	// Profile image from JSON-LD or og:image meta tag
	let profileImageUrl: string | null = null;
	if (mainEntity) {
		const image = mainEntity.image as Record<string, unknown> | undefined;
		if (image && typeof image.contentUrl === "string") {
			profileImageUrl = image.contentUrl;
		} else if (typeof mainEntity.image === "string") {
			profileImageUrl = mainEntity.image;
		}
	}
	// Fall back to og:image for SSR responses (skip generic X.com default image)
	if (!profileImageUrl && ogImage && ogImage.includes("pbs.twimg.com/profile_images")) {
		profileImageUrl = ogImage;
	}

	// Profile-level verification: check the UserName element for a verification badge
	let isProfileVerified: boolean | undefined;
	if (isProfile) {
		const userNameEl = selectOne('[data-testid="UserName"]', doc) as Element | null;
		if (userNameEl) {
			const verifiedEl = selectOne('[data-testid="icon-verified"]', userNameEl) as Element | null;
			if (verifiedEl) {
				isProfileVerified = true;
			} else {
				const svgs = selectAll("svg", userNameEl) as unknown as Element[];
				isProfileVerified = svgs.some(svg => {
					const ariaLabel = getAttributeValue(svg, "aria-label") ?? "";
					return ariaLabel.includes("Verified");
				}) || undefined;
			}
		}
	}

	return {
		type: "social",
		title,
		url,
		platform: "twitter",
		sectionTitle: isProfile ? (profileName ?? effectiveTitle) : effectiveTitle,
		description,
		posts,
		post: null,
		comments,
		profileImageUrl,
		isProfileVerified,
	};
}
