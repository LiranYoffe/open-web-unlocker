/**
 * to-markdown.ts — Convert structured PageData back to a markdown string.
 *
 * Each type formatter reproduces (or improves) the output that the parser
 * previously generated directly. This keeps markdown format backward-compatible
 * while enabling structured JSON output via the same parser pipeline.
 */

import type {
	AppData,
	ArticleData,
	BookData,
	BrowseDirectoryData,
	ContainerImageData,
	LodgingSearchProperty,
	BusinessData,
	CompanyData,
	DocumentationData,
	EventData,
	FilmData,
	GenericData,
	ImdbPersonData,
	JobPostingData,
	LodgingData,
	LodgingSearchData,
	MusicData,
	PackageData,
	PageData,
	PaperData,
	PersonProfileData,
	ProductData,
	ProductSearchData,
	PropertyData,
	QaData,
	RepoData,
	SearchResultsData,
	SocialData,
	SocialProfileData,
	StockQuoteData,
	VideoData,
	WikiData,
} from "./page-data";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse ISO 8601 duration like PT4M32S → "4m 32s" */
function formatDuration(iso: string): string | null {
	const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return null;
	const [, h, m, s] = match;
	const parts: string[] = [];
	if (h) parts.push(`${h}h`);
	if (m) parts.push(`${m}m`);
	if (s) parts.push(`${s}s`);
	return parts.length > 0 ? parts.join(" ") : null;
}

function clean(s: string): string {
	return s.replace(/\n{3,}/g, "\n\n").trim();
}

// ── Per-type formatters ───────────────────────────────────────────────────────

function toMarkdownArticle(data: ArticleData): string {
	const parts: string[] = [];
	if (data.headline) parts.push(`# ${data.headline}`);
	if (data.author) parts.push(`**Author:** ${data.author}`);
	if (data.datePublished) parts.push(`**Published:** ${data.datePublished}`);
	if (data.content) parts.push(data.content);
	return clean(parts.join("\n\n"));
}

function toMarkdownVideo(data: VideoData): string {
	const parts: string[] = [];
	if (data.title) parts.push(`# ${data.title}`);

	if (data.platform === "youtube") {
		if (data.channel) {
			const text = data.channelUrl ? `[${data.channel}](${data.channelUrl})` : data.channel;
			parts.push(`**Channel:** ${text}`);
		}
		if (data.handle) parts.push(`**Handle:** ${data.handle}`);
		if (data.subscriberCount) parts.push(`**Subscribers:** ${data.subscriberCount}`);
		if (data.videoCount) parts.push(`**Videos:** ${data.videoCount}`);
	} else {
		// vimeo
		if (data.channel) {
			const text = data.channelUrl ? `[${data.channel}](${data.channelUrl})` : data.channel;
			parts.push(`**Creator:** ${text}`);
		}
	}

	if (data.uploadDate) parts.push(`**Uploaded:** ${data.uploadDate.split("T")[0]}`);
	if (data.duration) {
		const dur = formatDuration(data.duration);
		if (dur) parts.push(`**Duration:** ${dur}`);
	}
	if (data.viewCount !== null) parts.push(`**Views:** ${data.viewCount.toLocaleString()}`);
	if (data.likeCount !== null) parts.push(`**Likes:** ${data.likeCount.toLocaleString()}`);
	if (data.genre) parts.push(`**Category:** ${data.genre}`);
	if (data.joinedDate) parts.push(`**Joined:** ${data.joinedDate}`);
	if (data.country) parts.push(`**Country:** ${data.country}`);
	if (data.channelLinks?.length) {
		parts.push(`**Links:** ${data.channelLinks.join(", ")}`);
	}
	if (data.description) parts.push(data.description.trim());
	if (data.comments && data.comments.length > 0) {
		const commentLines = data.comments.map(c => {
			const meta: string[] = [];
			if (c.author) meta.push(`**${c.author}**`);
			if (c.likes !== null) meta.push(`${c.likes} likes`);
			if (c.replyCount !== null) meta.push(`${c.replyCount} replies`);
			if (c.date) meta.push(c.date);
			const metaStr = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
			return `- ${c.text.slice(0, 500)}${metaStr}`;
		});
		parts.push(`## Comments\n\n${commentLines.join("\n\n")}`);
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownProduct(data: ProductData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.brand) parts.push(`**Brand:** ${data.brand}`);
	if (data.seller) parts.push(`**Seller:** ${data.seller}`);
	if (data.sku) {
		const label = data.platform === "amazon" ? "ASIN" : "SKU";
		parts.push(`**${label}:** ${data.sku}`);
	}
	if (data.gtin) parts.push(`**GTIN:** ${data.gtin}`);
	if (data.price != null) {
		const curr = data.currency ?? "";
		parts.push(`**Price:** ${curr}${data.price}`);
	}
	if (data.availability) parts.push(`**Availability:** ${data.availability}`);
	if (data.condition) parts.push(`**Condition:** ${data.condition}`);
	if (data.listedDate) parts.push(`**Listed:** ${data.listedDate}`);
	if (data.location) parts.push(`**Location:** ${data.location}`);
	if (data.categories?.length) parts.push(`**Categories:** ${data.categories.join(" > ")}`);
	if (data.rating != null) {
		const countStr = data.reviewCount ? ` (${data.reviewCount} reviews)` : "";
		parts.push(`**Rating:** ${data.rating}/5${countStr}`);
	}
	if (data.features?.length) {
		parts.push(`## Features\n\n${data.features.map((f) => `- ${f}`).join("\n")}`);
	}
	if (data.totalRatingCount && data.ratingHistogram?.length) {
		const histLines = data.ratingHistogram.map((h) => `- ${h.stars} star: ${h.percentage}%`);
		parts.push(`## Rating Breakdown (${data.totalRatingCount} ratings)\n\n${histLines.join("\n")}`);
	}
	if (data.description) parts.push(`## Description\n\n${data.description}`);
	if (data.specifications?.length) {
		const label = data.platform === "ebay" ? "Item Specifics" : "Specifications";
		const specs = data.specifications.map(({ key, value }) => `- **${key}:** ${value}`).join("\n");
		parts.push(`## ${label}\n\n${specs}`);
	}
	if (data.topReviews?.length) {
		const reviewLines = data.topReviews.map((r) => {
			const meta: string[] = [];
			if (r.rating) meta.push(`${r.rating}/5`);
			if (r.author) meta.push(r.author);
			if (r.date) meta.push(r.date);
			if (r.verified) meta.push("Verified");
			if (r.helpfulVotes) meta.push(`${r.helpfulVotes} helpful`);
			const metaStr = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
			const titleStr = r.title ? `**${r.title}**\n` : "";
			return `- ${titleStr}${r.body.slice(0, 500)}${metaStr}`;
		});
		parts.push(`## Top Reviews\n\n${reviewLines.join("\n\n")}`);
	}
	return clean(parts.join("\n\n"));
}

function toMarkdownRepo(data: RepoData): string {
	if (data.issue) {
		const { issue } = data;

		if (data.platform === "gitlab") {
			const parts: string[] = [];
			parts.push(`# ${issue.title}`);
			if (issue.state) {
				const typeLabel = issue.issueType === "mr" ? "Merge Request" : "Issue";
				parts.push(`**${typeLabel} State:** ${issue.state}`);
			}
			if (issue.body) parts.push(`## Description\n\n${issue.body}`);
			if (issue.comments.length > 0) {
				const commentBlocks = issue.comments.map((c) => c.body).join("\n\n---\n\n");
				parts.push(`## Comments (${issue.comments.length})\n\n${commentBlocks}`);
			}
			return clean(parts.join("\n\n"));
		}

		// GitHub issue
		const parts: string[] = [];
		parts.push(`# ${issue.title}`);
		if (issue.state) parts.push(`**State:** ${issue.state}`);
		if (issue.body) parts.push(issue.body);
		for (const comment of issue.comments) {
			if (comment.body) parts.push(comment.body);
		}
		return clean(parts.join("\n\n---\n\n"));
	}

	if (data.platform === "github") {
		const parts: string[] = [];
		if (data.description) parts.push(data.description);
		const starFork: string[] = [];
		if (data.stars) starFork.push(`⭐ ${data.stars} stars`);
		if (data.forks) starFork.push(`🍴 ${data.forks} forks`);
		if (starFork.length > 0) parts.push(starFork.join("  ·  "));
		if (data.topics?.length) parts.push(`**Topics:** ${data.topics.join(", ")}`);
		if (data.readmeContent) parts.push(data.readmeContent);
		return clean(parts.join("\n\n"));
	}

	// GitLab repo page
	const parts: string[] = [];
	if (data.title) parts.push(`# ${data.title}`);
	if (data.description) parts.push(data.description);
	if (data.language) parts.push(`**Language:** ${data.language}`);
	if (data.repositoryUrl) parts.push(`**Repository:** ${data.repositoryUrl}`);
	if (data.readmeContent) parts.push(`## README\n\n${data.readmeContent}`);
	if (data.stars) parts.push(`**Stars:** ${data.stars}`);
	return clean(parts.join("\n\n"));
}

function toMarkdownQa(data: QaData): string {
	const parts: string[] = [];

	if (data.platform === "stackoverflow") {
		if (data.title) parts.push(`# ${data.title}`);
		if (data.question.text) parts.push(data.question.text);
		if (data.question.votes !== null) {
			parts.push(`**Question votes:** ${data.question.votes.toLocaleString()}`);
		}
		for (const answer of data.answers) {
			const voteSuffix =
				answer.votes !== null ? ` (${answer.votes.toLocaleString()} votes)` : "";
			const header = answer.isAccepted ? `## Accepted Answer${voteSuffix}` : `## Answer${voteSuffix}`;
			parts.push(`${header}\n\n${answer.body}`);
		}
		return clean(parts.join("\n\n---\n\n"));
	}

	if (data.platform === "hackernews") {
		if (data.question.text) parts.push(data.question.text);
		if (data.answers.length > 0) {
			parts.push("## Comments");
			for (const answer of data.answers) {
				parts.push(answer.body);
			}
		}
		return clean(parts.join("\n\n---\n\n"));
	}

	// quora
	if (data.title) parts.push(`# ${data.title}`);
	if (data.question.text) parts.push(data.question.text);
	for (const answer of data.answers) {
		parts.push(`---\n\n${answer.body}`);
	}
	return clean(parts.join("\n\n"));
}

function toMarkdownPackage(data: PackageData): string {
	const parts: string[] = [];
	if (data.name) {
		const vStr = data.version
			? data.registry === "npm"
				? ` v${data.version}`
				: ` ${data.version}`
			: "";
		parts.push(`# ${data.name}${vStr}`);
	}
	if (data.description) parts.push(data.description);
	if (data.author) parts.push(`**Author:** ${data.author}`);
	if (data.keywords.length > 0) parts.push(`**Keywords:** ${data.keywords.join(", ")}`);
	if (data.license) parts.push(`**License:** ${data.license}`);
	if (data.repository) parts.push(`**Repository:** ${data.repository}`);
	if (data.homepage) parts.push(`**Homepage:** ${data.homepage}`);
	if (data.installCommand) parts.push(`**Install:** \`${data.installCommand}\``);
	return clean(parts.join("\n\n"));
}

function toMarkdownContainerImage(data: ContainerImageData): string {
	const parts: string[] = [];
	const heading = data.namespace && data.image
		? `# ${data.namespace}/${data.image}`
		: data.image ? `# ${data.image}` : data.title ? `# ${data.title}` : null;
	if (heading) parts.push(heading);
	if (data.official) parts.push("**Official image**");
	if (data.description) parts.push(data.description);

	const stats: string[] = [];
	if (data.pulls) stats.push(`${data.pulls} pulls`);
	if (data.stars) stats.push(`${data.stars} stars`);
	if (stats.length > 0) parts.push(stats.join(" · "));

	if (data.categories.length > 0) parts.push(`**Categories:** ${data.categories.join(", ")}`);
	if (data.sourceRepository) parts.push(`**Source:** ${data.sourceRepository}`);
	if (data.overview) parts.push(`## Overview\n\n${data.overview}`);

	return clean(parts.join("\n\n"));
}

function toMarkdownPaper(data: PaperData): string {
	const parts: string[] = [];
	if (data.paperTitle) parts.push(`# ${data.paperTitle}`);
	if (data.authors.length > 0) parts.push(`**Authors:** ${data.authors.join(", ")}`);
	if (data.dateSubmitted) parts.push(`**Submitted:** ${data.dateSubmitted}`);
	if (data.subjects) parts.push(`**Subjects:** ${data.subjects}`);
	if (data.comments) parts.push(`**Comments:** ${data.comments}`);
	if (data.journalRef) parts.push(`**Journal ref:** ${data.journalRef}`);
	if (data.abstract) parts.push(`## Abstract\n\n${data.abstract}`);
	if (data.pdfUrl) parts.push(`**PDF:** ${data.pdfUrl}`);
	if (data.url) parts.push(`**arXiv:** ${data.url}`);
	return clean(parts.join("\n\n"));
}

function toMarkdownFilm(data: FilmData): string {
	const parts: string[] = [];
	if (data.title) parts.push(`# ${data.title}`);
	if (data.contentRating) parts.push(`**Rated:** ${data.contentRating}`);
	if (data.description) parts.push(data.description);

	if (data.rating !== null) {
		const countStr = data.ratingCount ? ` (${data.ratingCount} reviews)` : "";
		if (data.platform === "rottentomatoes") {
			parts.push(`**Tomatometer:** ${data.rating}%${countStr}`);
		} else if (data.platform === "metacritic") {
			parts.push(`**Metascore:** ${data.rating}/100${countStr}`);
		} else {
			parts.push(`**Rating:** ${data.rating}/10${countStr}`);
		}
	}
	if (data.audienceScore) {
		parts.push(`**Audience Score:** ${data.audienceScore}%`);
	}
	if (data.genre?.length) parts.push(`**Genre:** ${data.genre.join(", ")}`);
	if (data.keywords) parts.push(`**Keywords:** ${data.keywords}`);
	if (data.director) parts.push(`**Director:** ${data.director}`);
	if (data.writers) parts.push(`**Writers:** ${data.writers}`);
	if (data.cast.length === 0 && data.actorList) {
		parts.push(`**Cast:** ${data.actorList}`);
	}
	if (data.datePublished) parts.push(`**Release Date:** ${data.datePublished}`);
	if (data.duration) {
		const dur = formatDuration(data.duration);
		if (dur) parts.push(`**Runtime:** ${dur}`);
	}

	if (data.review) {
		const label = [data.review.name, data.review.author].filter(Boolean).join(" by ");
		const header = label ? `## Featured Review: ${label}` : "## Featured Review";
		parts.push(`${header}\n\n${data.review.body.replace(/\n{3,}/g, "\n\n").trim()}`);
	}

	if (data.metacriticScore) {
		parts.push(`**Metacritic:** ${data.metacriticScore}/100`);
	}

	if (data.cast.length > 0) {
		const castLines = data.cast.map(({ actor, character }) =>
			character ? `- ${actor} as ${character}` : `- ${actor}`,
		);
		parts.push(`## Cast\n\n${castLines.join("\n")}`);
	}

	if (data.boxOffice) {
		const { boxOffice } = data;
		const boxLines: string[] = [];
		if (boxOffice.budget) boxLines.push(`- **Budget:** ${boxOffice.budget}`);
		if (boxOffice.grossDomestic) boxLines.push(`- **Gross (US & Canada):** ${boxOffice.grossDomestic}`);
		if (boxOffice.openingWeekend) boxLines.push(`- **Opening Weekend (US):** ${boxOffice.openingWeekend}`);
		if (boxLines.length > 0) parts.push(`## Box Office\n\n${boxLines.join("\n")}`);
	}

	if (data.techSpecs) {
		const { techSpecs } = data;
		const techLines: string[] = [];
		if (techSpecs.runtime) techLines.push(`- **Runtime:** ${techSpecs.runtime}`);
		if (techSpecs.color) techLines.push(`- **Color:** ${techSpecs.color}`);
		if (techSpecs.sound) techLines.push(`- **Sound Mix:** ${techSpecs.sound}`);
		if (techSpecs.aspectRatio) techLines.push(`- **Aspect Ratio:** ${techSpecs.aspectRatio}`);
		if (techLines.length > 0) parts.push(`## Technical Specs\n\n${techLines.join("\n")}`);
	}

	if (data.details) {
		const { details } = data;
		const detailLines: string[] = [];
		if (details.releaseDate) detailLines.push(`- **Release Date:** ${details.releaseDate}`);
		if (details.country) detailLines.push(`- **Country:** ${details.country}`);
		if (details.languages.length > 0)
			detailLines.push(`- **Language(s):** ${details.languages.join(", ")}`);
		if (details.akas) detailLines.push(`- **Also Known As:** ${details.akas}`);
		if (detailLines.length > 0) parts.push(`## Details\n\n${detailLines.join("\n")}`);
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownImdbPerson(data: ImdbPersonData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.occupation) parts.push(`**Occupation:** ${data.occupation}`);
	if (data.birthDate) parts.push(`**Born:** ${data.birthDate}`);
	if (data.bio) parts.push(data.bio);
	return clean(parts.join("\n\n"));
}

function toMarkdownCompany(data: CompanyData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.tagline) parts.push(`*${data.tagline}*`);
	if (data.description && data.description !== data.tagline) parts.push(data.description);

	const meta: string[] = [];
	if (data.industry) meta.push(`**Industry:** ${data.industry}`);
	if (data.employeeCount) meta.push(`**Employees:** ${data.employeeCount}`);
	if (data.companyType) meta.push(`**Type:** ${data.companyType}`);
	if (data.headquarters) meta.push(`**HQ:** ${data.headquarters}`);
	if (data.founded) meta.push(`**Founded:** ${data.founded}`);
	if (data.website) meta.push(`**Website:** ${data.website}`);
	if (data.followers) meta.push(`**Followers:** ${data.followers}`);
	if (data.rating != null) {
		const countStr = data.reviewCount ? ` (${data.reviewCount} reviews)` : "";
		meta.push(`**Rating:** ${data.rating}${countStr}`);
	}
	// Crunchbase-specific meta
	if (data.legalName) meta.push(`**Legal Name:** ${data.legalName}`);
	if (data.operatingStatus) meta.push(`**Status:** ${data.operatingStatus}`);
	if (data.contactEmail) meta.push(`**Email:** ${data.contactEmail}`);
	if (data.phone) meta.push(`**Phone:** ${data.phone}`);
	if (data.lastFundingType) meta.push(`**Last Funding:** ${data.lastFundingType}`);
	if (data.fundingRounds) meta.push(`**Funding Rounds:** ${data.fundingRounds}`);
	if (data.aliases && data.aliases.length > 0) meta.push(`**Also Known As:** ${data.aliases.join(", ")}`);
	if (meta.length > 0) parts.push(meta.join("\n\n"));

	if (data.specialties?.length) {
		parts.push(`**Specialties:** ${data.specialties.join(", ")}`);
	}

	if (data.founders && data.founders.length > 0) {
		parts.push(`## Founders\n\n${data.founders.map((f) => `- ${f}`).join("\n")}`);
	}

	if (data.employees?.length) {
		const lines = data.employees.map((e) =>
			e.profileUrl ? `- [${e.name}](${e.profileUrl})` : `- ${e.name}`,
		);
		parts.push(`## Key People\n\n${lines.join("\n")}`);
	}

	if (data.boardMembers && data.boardMembers.length > 0) {
		parts.push(`## Board Members\n\n${data.boardMembers.map((m) => `- ${m}`).join("\n")}`);
	}

	if (data.investors && data.investors.length > 0) {
		parts.push(`## Investors\n\n${data.investors.map((i) => `- ${i}`).join("\n")}`);
	}

	if (data.similarPages?.length) {
		const heading = data.platform === "crunchbase" ? "Competitors" : "Similar Pages";
		const lines = data.similarPages.map((p) => {
			const link = p.url ? `[${p.name}](${p.url})` : p.name;
			return p.description ? `- ${link} — ${p.description}` : `- ${link}`;
		});
		parts.push(`## ${heading}\n\n${lines.join("\n")}`);
	}

	if (data.jobListings && data.jobListings.length > 0) {
		const lines = data.jobListings.map((j) => {
			const meta: string[] = [];
			if (j.location) meta.push(j.location);
			if (j.salary) meta.push(j.salary);
			if (j.datePosted) meta.push(j.datePosted);
			const metaPart = meta.length > 0 ? ` — ${meta.join(" · ")}` : "";
			const link = j.jobUrl ? `[${j.jobTitle}](${j.jobUrl})` : j.jobTitle;
			return `- ${link}${metaPart}`;
		});
		parts.push(`## Job Openings\n\n${lines.join("\n")}`);
	}

	if (data.cultureBlocks && data.cultureBlocks.length > 0) {
		const blocks = data.cultureBlocks.map((b) => {
			const linkPart = b.linkUrl ? `\n[Learn more](${b.linkUrl})` : "";
			return `### ${b.heading}\n\n${b.body}${linkPart}`;
		});
		parts.push(`## Culture\n\n${blocks.join("\n\n")}`);
	}

	if (data.posts?.length) {
		const postLines = data.posts.map((p) => {
			const meta: string[] = [];
			if (p.datePublished) meta.push(p.datePublished.split("T")[0] ?? p.datePublished);
			if (p.reactions) meta.push(`${p.reactions} reactions`);
			if (p.comments) meta.push(`${p.comments} comments`);
			const metaPart = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
			const urlPart = p.url ? `\n  ${p.url}` : "";
			const headlinePart = p.headline ? `\n  **${p.headline}**` : "";
			const resharedPart = p.resharedText ? `\n  > ${p.resharedText.slice(0, 200).replace(/\n/g, " ")}` : "";
			return `- ${p.text.slice(0, 300).replace(/\n/g, " ")}${metaPart}${headlinePart}${resharedPart}${urlPart}`;
		});
		parts.push(`## Posts\n\n${postLines.join("\n\n")}`);
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownPerson(data: PersonProfileData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.headline) parts.push(`*${data.headline}*`);
	if (data.location) parts.push(`**Location:** ${data.location}`);
	if (data.bio) parts.push(data.bio);
	if (data.followers) parts.push(`**Followers:** ${data.followers}`);
	if (data.connections) parts.push(`**Connections:** ${data.connections}`);

	if (data.experience.length > 0) {
		const lines = data.experience.map(({ role, company, dateRange }) => {
			const entryParts: string[] = [];
			if (role) entryParts.push(`**${role}**`);
			if (company) entryParts.push(company);
			const entry = entryParts.join(", ") || company || role;
			return dateRange ? `- ${entry} · ${dateRange}` : `- ${entry}`;
		});
		parts.push(`## Experience\n\n${lines.join("\n")}`);
	}

	if (data.education.length > 0) {
		const lines = data.education.map(({ school, degree, dateRange }) => {
			let line = school;
			if (degree) line += ` — ${degree}`;
			if (dateRange) line += ` · ${dateRange}`;
			return `- ${line}`;
		});
		parts.push(`## Education\n\n${lines.join("\n")}`);
	}

	if (data.articles.length > 0) {
		const articleLines: string[] = [];
		for (const { title, url, date, snippet, reactions, comments } of data.articles) {
			const titlePart = url ? `[${title}](${url})` : title;
			const meta: string[] = [];
			if (date) meta.push(date);
			if (reactions) meta.push(`${reactions} reactions`);
			if (comments) meta.push(`${comments} comments`);
			const metaPart = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
			articleLines.push(`### ${titlePart}${metaPart}`);
			if (snippet) articleLines.push(snippet);
		}
		parts.push(`## Articles\n\n${articleLines.join("\n\n")}`);
	}

	if (data.posts.length > 0) {
		const postLines = data.posts.map((p) => {
			const meta: string[] = [];
			if (p.datePublished) meta.push(p.datePublished.split("T")[0] ?? p.datePublished);
			if (p.reactions) meta.push(`${p.reactions} reactions`);
			if (p.comments) meta.push(`${p.comments} comments`);
			const metaPart = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
			const urlPart = p.url ? `\n  ${p.url}` : "";
			const headlinePart = p.headline ? `\n  **${p.headline}**` : "";
			const resharedPart = p.resharedText ? `\n  > ${p.resharedText.slice(0, 200).replace(/\n/g, " ")}` : "";
			return `- ${p.text.slice(0, 300).replace(/\n/g, " ")}${metaPart}${headlinePart}${resharedPart}${urlPart}`;
		});
		parts.push(`## Posts\n\n${postLines.join("\n\n")}`);
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownJob(data: JobPostingData): string {
	const parts: string[] = [];
	if (data.jobTitle) parts.push(`# ${data.jobTitle}`);
	if (data.company) parts.push(`**Company:** ${data.company}`);
	if (data.location) parts.push(`**Location:** ${data.location}`);
	if (data.salary) parts.push(`**Salary:** ${data.salary}`);
	if (data.employmentType) parts.push(`**Type:** ${data.employmentType}`);
	if (data.seniorityLevel) parts.push(`**Seniority:** ${data.seniorityLevel}`);
	if (data.datePosted) parts.push(`**Posted:** ${data.datePosted}`);
	if (data.jobId) parts.push(`**Job ID:** ${data.jobId}`);
	if (data.applyUrl) parts.push(`**Apply:** ${data.applyUrl}`);
	if (data.description) parts.push(`## Job Description\n\n${data.description.slice(0, 2000)}`);
	return clean(parts.join("\n\n"));
}

function toMarkdownSocialProfile(data: SocialProfileData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.handle) parts.push(`**Handle:** @${data.handle}`);
	if (data.verified) parts.push("**Verified**");
	if (data.bio) parts.push(data.bio);

	const meta: string[] = [];
	if (data.followers) meta.push(`**Followers:** ${data.followers}`);
	if (data.following) meta.push(`**Following:** ${data.following}`);
	if (data.postCount) meta.push(`**Posts:** ${data.postCount}`);
	if (data.likeCount) meta.push(`**Likes:** ${data.likeCount}`);
	if (data.category) meta.push(`**Category:** ${data.category}`);
	if (data.externalUrl) meta.push(`**Link:** ${data.externalUrl}`);
	if (meta.length > 0) parts.push(meta.join("\n\n"));

	if (data.posts?.length) {
		const postLines = data.posts.map((p) => {
			const metaParts: string[] = [];
			if (p.datePublished) metaParts.push(p.datePublished);
			if (p.reactions) metaParts.push(`${p.reactions} reactions`);
			if (p.comments) metaParts.push(`${p.comments} comments`);
			const metaSuffix = metaParts.length > 0 ? ` *(${metaParts.join(" · ")})*` : "";
			const linkSuffix = p.url ? `\n  ${p.url}` : "";
			return `- ${p.text.slice(0, 300).replace(/\n/g, " ")}${metaSuffix}${linkSuffix}`;
		});
		parts.push(`## Posts\n\n${postLines.join("\n\n")}`);
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownSocial(data: SocialData): string {
	const parts: string[] = [];

	// Single post page
	if (data.post) {
		const { post } = data;
		parts.push(post.url ? `# [${post.title}](${post.url})` : `# ${post.title}`);

		const meta: string[] = [];
		if (post.subreddit) meta.push(`**Subreddit:** r/${post.subreddit.replace(/^r\//, "")}`);
		if (post.author) {
			if (data.platform === "reddit") meta.push(`**Author:** u/${post.author}`);
			else meta.push(`**Author:** ${post.author}`);
		}
		if (post.authorHandle) meta.push(`**Handle:** @${post.authorHandle}`);
		if (post.score) meta.push(`**Score:** ${post.score}`);
		if (post.likeCount) meta.push(`**Likes:** ${post.likeCount}`);
		if (post.commentCount) meta.push(`**Comments:** ${post.commentCount}`);
		if (post.shareCount) meta.push(`**Shares:** ${post.shareCount}`);
		if (post.viewCount) meta.push(`**Views:** ${post.viewCount}`);
		if (post.domain && !post.domain.startsWith("self.")) meta.push(`**Domain:** ${post.domain}`);
		if (post.date) meta.push(`**Posted:** ${post.date}`);
		if (meta.length > 0) parts.push(meta.join(" | "));

		if (post.body) parts.push(post.body);
		if (post.videoUrl) parts.push(`**Video:** ${post.videoUrl}`);
		if (post.mediaUrls?.length) parts.push(`**Media:** ${post.mediaUrls.join(", ")}`);

		if (data.comments.length > 0) {
			parts.push("## Comments");
			for (const comment of data.comments) {
				const header = [
					comment.author ? `**${comment.author}**` : null,
					comment.score ? `(${comment.score} points)` : null,
					comment.date ?? null,
				]
					.filter(Boolean)
					.join(" ");
				parts.push(header ? `${header}\n\n${comment.body}` : comment.body);
			}
		}

		return clean(parts.join("\n\n"));
	}

	// Listing / front page
	if (data.sectionTitle) parts.push(`# ${data.sectionTitle}`);
	if (data.isProfileVerified) parts.push("**Verified**");
	if (data.description) parts.push(data.description);

	if ((data.posts?.length ?? 0) > 0) {
		if (data.platform === "hackernews") {
			for (const post of data.posts ?? []) {
				const domainSuffix = post.domain ? ` (${post.domain})` : "";
				const meta: string[] = [];
				if (post.score) meta.push(post.score);
				if (post.author) meta.push(`by ${post.author}`);
				if (post.date) meta.push(post.date);
				if (post.comments) meta.push(post.comments);
				const metaSuffix = meta.length > 0 ? ` — ${meta.join(" | ")}` : "";
				parts.push(`- [${post.title}](${post.url})${domainSuffix}${metaSuffix}`);
			}
		} else if (data.platform === "twitter") {
			// Twitter profile tweets with author + date
			parts.push("## Posts");
			for (const post of data.posts ?? []) {
				const meta: string[] = [];
				if (post.author) meta.push(`**${post.author}**`);
				if (post.isVerified) meta.push("Verified");
				if (post.date) meta.push(post.date.split("T")[0] ?? post.date);
				const metaSuffix = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
				const link = post.url ? `\n  ${post.url}` : "";
				let content = `- ${post.title}${metaSuffix}${link}`;
				if (post.quotedPost) {
					const qAuthor = post.quotedPost.author ? `**${post.quotedPost.author}:** ` : "";
					content += `\n  > ${qAuthor}${post.quotedPost.text.slice(0, 200)}`;
				}
				if (post.mediaUrls && post.mediaUrls.length > 0) {
					content += `\n  Images: ${post.mediaUrls.join(", ")}`;
				}
				parts.push(content);
			}
		} else if (data.platform === "instagram" || data.platform === "tiktok" || data.platform === "facebook") {
			parts.push("## Posts");
			for (const post of data.posts ?? []) {
				const meta: string[] = [];
				if (post.author) meta.push(`**${post.author}**`);
				if (post.date) meta.push(post.date);
				if (post.comments) meta.push(`${post.comments} comments`);
				const metaSuffix = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
				parts.push(`- [${post.title}](${post.url})${metaSuffix}`);
			}
		} else {
			// Reddit subreddit listing
			parts.push("## Posts");
			for (const post of data.posts ?? []) {
				const stickyBadge = post.isSticky ? " 📌" : "";
				const meta: string[] = [];
				if (post.score) meta.push(`${post.score} pts`);
				if (post.author) meta.push(`u/${post.author}`);
				if (post.comments) meta.push(`${post.comments} comments`);
				if (post.date) meta.push(post.date);
				if (post.domain && !post.domain.startsWith("self.")) meta.push(post.domain);
				const metaSuffix = meta.length > 0 ? ` *(${meta.join(" · ")})*` : "";
				parts.push(`- [${post.title}](${post.url})${stickyBadge}${metaSuffix}`);
			}
		}
	}

	// Twitter fallback: plain tweet text when posts array was not populated
	if (data.platform === "twitter" && (data.posts?.length ?? 0) === 0 && data.comments.length > 0) {
		for (const comment of data.comments) {
			parts.push(comment.body);
		}
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownDocumentation(data: DocumentationData): string {
	const parts: string[] = [];
	if (data.breadcrumb) parts.push(`*${data.breadcrumb}*`);
	if (data.title) parts.push(`# ${data.title}`);
	if (data.version) parts.push(`**Version:** ${data.version}`);
	if (data.content) parts.push(data.content);
	return clean(parts.join("\n\n"));
}

function toMarkdownLodging(data: LodgingData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.propertyType) parts.push(`**Property Type:** ${data.propertyType}`);
	if (data.price) parts.push(`**Price:** ${data.price}`);
	if (data.description) parts.push(data.description);
	if (data.address) parts.push(`**Address:** ${data.address}`);
	if (data.rating !== null) {
		if (data.reviewCount !== null) {
			parts.push(`**Rating:** ${data.rating} (${data.reviewCount} reviews)`);
		} else {
			parts.push(`**Review Score:** ${data.rating}`);
		}
	}
	if (data.categoryRatings && data.categoryRatings.length > 0) {
		const lines = data.categoryRatings.map(r => `- **${r.category}:** ${r.rating}`);
		parts.push(`### Rating Breakdown\n\n${lines.join("\n")}`);
	}
	const details: string[] = [];
	if (data.guests) details.push(data.guests);
	if (data.bedrooms) details.push(data.bedrooms);
	if (data.beds) details.push(data.beds);
	if (data.bathrooms) details.push(data.bathrooms);
	if (details.length > 0) parts.push(`**Details:** ${details.join(" · ")}`);
	if (data.hostName) {
		const superhost = data.hostIsSuperhost ? " (Superhost)" : "";
		const years = data.hostYearsHosting ? `, ${data.hostYearsHosting} years hosting` : "";
		parts.push(`**Host:** ${data.hostName}${superhost}${years}`);
	}
	if (data.hostAbout) parts.push(`> ${data.hostAbout.slice(0, 500)}`);
	if (data.highlights && data.highlights.length > 0) {
		parts.push(`## Highlights\n\n${data.highlights.map(h => `- ${h}`).join("\n")}`);
	}
	if (data.amenities.length > 0) {
		parts.push(`## Amenities\n\n${data.amenities.map((a) => `- ${a}`).join("\n")}`);
	}
	if (data.houseRules && data.houseRules.length > 0) {
		parts.push(`## House Rules\n\n${data.houseRules.map(r => `- ${r}`).join("\n")}`);
	}
	if (data.neighborhoodHighlights) {
		parts.push(`## Neighborhood\n\n${data.neighborhoodHighlights}`);
	}
	if (data.latitude != null && data.longitude != null) {
		parts.push(`**Coordinates:** ${data.latitude}, ${data.longitude}`);
	}
	return clean(parts.join("\n\n"));
}

function toMarkdownBook(data: BookData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.author) parts.push(`**Author:** ${data.author}`);
	if (data.series) parts.push(`**Series:** ${data.series}`);
	if (data.rating !== null) {
		const countStr = data.ratingCount ? ` (${data.ratingCount} ratings)` : "";
		parts.push(`**Rating:** ${data.rating}/5${countStr}`);
	}
	if (data.reviewCount) parts.push(`**Reviews:** ${data.reviewCount}`);
	if (data.genres.length > 0) parts.push(`**Genres:** ${data.genres.join(", ")}`);
	if (data.pageCount) parts.push(`**Pages:** ${data.pageCount}`);
	if (data.publisher) parts.push(`**Publisher:** ${data.publisher}`);
	if (data.publishDate) parts.push(`**Published:** ${data.publishDate}`);
	if (data.isbn) parts.push(`**ISBN:** ${data.isbn}`);
	if (data.description) parts.push(`## Description\n\n${data.description}`);
	return clean(parts.join("\n\n"));
}

function toMarkdownApp(data: AppData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.developer) parts.push(`**Developer:** ${data.developer}`);
	if (data.category) parts.push(`**Category:** ${data.category}`);
	if (data.price !== null) parts.push(`**Price:** ${data.price}`);
	if (data.rating !== null) {
		const countStr = data.ratingCount ? ` (${data.ratingCount} ratings)` : "";
		parts.push(`**Rating:** ${data.rating}/5${countStr}`);
	}
	if (data.version) parts.push(`**Version:** ${data.version}`);
	if (data.size) parts.push(`**Size:** ${data.size}`);
	if (data.compatibility) parts.push(`**Compatibility:** ${data.compatibility}`);
	if (data.releaseDate) parts.push(`**Updated:** ${data.releaseDate}`);
	if (data.description) parts.push(`## Description\n\n${data.description}`);
	if (data.whatsNew) parts.push(`## What's New\n\n${data.whatsNew}`);
	return clean(parts.join("\n\n"));
}

function toMarkdownMusic(data: MusicData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.artist) parts.push(`**Artist:** ${data.artist}`);
	if (data.album) parts.push(`**Album:** ${data.album}`);
	if (data.releaseDate) parts.push(`**Released:** ${data.releaseDate}`);
	if (data.duration) parts.push(`**Duration:** ${data.duration}`);
	if (data.trackNumber !== null) parts.push(`**Track:** ${data.trackNumber}`);
	if (data.genre?.length) parts.push(`**Genre:** ${data.genre.join(", ")}`);
	if (data.playCount) parts.push(`**Plays:** ${data.playCount}`);
	if (data.monthlyListeners) parts.push(`**Monthly Listeners:** ${data.monthlyListeners}`);
	if (data.bio) parts.push(data.bio);
	if (data.trackList.length > 0) {
		const trackLines = data.trackList.map((t) => {
			const durSuffix = t.duration ? ` (${t.duration})` : "";
			const artistSuffix = t.artist ? ` — ${t.artist}` : "";
			return `- ${t.name}${artistSuffix}${durSuffix}`;
		});
		parts.push(`## Track List\n\n${trackLines.join("\n")}`);
	}
	return clean(parts.join("\n\n"));
}

function toMarkdownBusiness(data: BusinessData): string {
	const parts: string[] = [];
	if (data.name) parts.push(`# ${data.name}`);
	if (data.businessId) parts.push(`**Business ID:** ${data.businessId}`);

	if (data.rating !== null) {
		const countStr = data.reviewCount ? ` (${data.reviewCount} reviews)` : "";
		parts.push(`**Rating:** ${data.rating}/5${countStr}`);
	}
	if (data.priceRange) parts.push(`**Price:** ${data.priceRange}`);
	if (data.categories?.length) parts.push(`**Categories:** ${data.categories.join(", ")}`);
	if (data.address) parts.push(`**Address:** ${data.address}`);
	if (data.phone) parts.push(`**Phone:** ${data.phone}`);
	if (data.website) parts.push(`**Website:** ${data.website}`);

	if (data.hours?.length) {
		const hourLines = data.hours.map(({ day, time }) => `- **${day}:** ${time}`);
		parts.push(`## Hours\n\n${hourLines.join("\n")}`);
	}

	if (data.amenities?.length) {
		parts.push(`## Amenities\n\n${data.amenities.map((a) => `- ${a}`).join("\n")}`);
	}

	if (data.description) parts.push(`## About\n\n${data.description}`);

	if (data.reviews.length > 0) {
		const reviewLines = data.reviews.map((r) => {
			const meta: string[] = [];
			if (r.author) meta.push(`**${r.author}**`);
			if (r.rating) meta.push(`${r.rating}/5`);
			if (r.date) meta.push(r.date);
			const header = meta.length > 0 ? `${meta.join(" · ")}\n\n` : "";
			let text = `${header}${r.body}`;
			if (r.subRatings?.length) {
				const subLines = r.subRatings.map(s => `${s.category}: ${s.rating}`).join(" · ");
				text += `\n\n*Sub-ratings: ${subLines}*`;
			}
			return text;
		});
		parts.push(`## Reviews\n\n${reviewLines.join("\n\n---\n\n")}`);
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownProperty(data: PropertyData): string {
	const parts: string[] = [];
	if (data.address) parts.push(`# ${data.address}`);
	if (data.status) parts.push(`**Status:** ${data.status}`);
	if (data.price) parts.push(`**Price:** ${data.price}`);
	if (data.zestimate) parts.push(`**Zestimate:** ${data.zestimate}`);
	if (data.propertyType) parts.push(`**Property Type:** ${data.propertyType}`);

	const details: string[] = [];
	if (data.bedrooms !== null) details.push(`${data.bedrooms} bed`);
	if (data.bathrooms !== null) details.push(`${data.bathrooms} bath`);
	if (data.squareFeet !== null) details.push(`${data.squareFeet.toLocaleString()} sqft`);
	if (details.length > 0) parts.push(`**Details:** ${details.join(" | ")}`);

	if (data.lotSize) parts.push(`**Lot Size:** ${data.lotSize}`);
	if (data.yearBuilt !== null) parts.push(`**Year Built:** ${data.yearBuilt}`);
	if (data.agent) parts.push(`**Agent:** ${data.agent}`);
	if (data.taxHistory) parts.push(`**Tax History:** ${data.taxHistory}`);
	if (data.zpid) parts.push(`**Zpid:** ${data.zpid}`);
	if (data.description) parts.push(`## Description\n\n${data.description}`);
	if (data.features.length > 0) {
		parts.push(`## Features\n\n${data.features.map((f) => `- ${f}`).join("\n")}`);
	}
	if (data.priceHistory && data.priceHistory.length > 0) {
		const histLines = data.priceHistory.map(h => {
			const parts: string[] = [];
			if (h.date) parts.push(h.date);
			if (h.event) parts.push(h.event);
			if (h.price) parts.push(h.price);
			if (h.priceChangeRate) parts.push(h.priceChangeRate);
			return `- ${parts.join(" — ")}`;
		});
		parts.push(`## Price History\n\n${histLines.join("\n")}`);
	}
	return clean(parts.join("\n\n"));
}

function toMarkdownEvent(data: EventData): string {
	const parts: string[] = [];
	if (data.eventName) parts.push(`# ${data.eventName}`);
	if (data.startDate) parts.push(`**When:** ${data.startDate}`);
	if (data.location) parts.push(`**Location:** ${data.location}`);
	if (data.organizer) parts.push(`**Organizer:** ${data.organizer}`);
	if (data.peopleResponded) parts.push(`**People Responded:** ${data.peopleResponded}`);
	if (data.duration) parts.push(`**Duration:** ${data.duration}`);
	if (data.privacy) parts.push(`**Privacy:** ${data.privacy}`);
	if (data.eventId) parts.push(`**Event ID:** ${data.eventId}`);
	if (data.description) parts.push(`## About\n\n${data.description}`);
	return clean(parts.join("\n\n"));
}

// ── Public entry point ────────────────────────────────────────────────────────

export function toMarkdown(data: PageData): string {
	switch (data.type) {
		case "article":
			return toMarkdownArticle(data as ArticleData);
		case "video":
			return toMarkdownVideo(data as VideoData);
		case "product":
			return toMarkdownProduct(data as ProductData);
		case "repo":
			return toMarkdownRepo(data as RepoData);
		case "qa":
			return toMarkdownQa(data as QaData);
		case "package":
			return toMarkdownPackage(data as PackageData);
		case "container-image":
			return toMarkdownContainerImage(data as ContainerImageData);
		case "paper":
			return toMarkdownPaper(data as PaperData);
		case "film":
			return toMarkdownFilm(data as FilmData);
		case "film-person":
			return toMarkdownImdbPerson(data as ImdbPersonData);
		case "company":
			return toMarkdownCompany(data as CompanyData);
		case "person":
			return toMarkdownPerson(data as PersonProfileData);
		case "social-profile":
			return toMarkdownSocialProfile(data as SocialProfileData);
		case "event":
			return toMarkdownEvent(data as EventData);
		case "job":
			return toMarkdownJob(data as JobPostingData);
		case "social":
			return toMarkdownSocial(data as SocialData);
		case "wiki":
			return (data as WikiData).content;
		case "documentation":
			return toMarkdownDocumentation(data as DocumentationData);
		case "lodging":
			return toMarkdownLodging(data as LodgingData);
		case "book":
			return toMarkdownBook(data as BookData);
		case "app":
			return toMarkdownApp(data as AppData);
		case "music":
			return toMarkdownMusic(data as MusicData);
		case "business":
			return toMarkdownBusiness(data as BusinessData);
		case "property":
			return toMarkdownProperty(data as PropertyData);
		case "product-search":
			return toMarkdownProductSearch(data as ProductSearchData);
		case "lodging-search":
			return toMarkdownLodgingSearch(data as LodgingSearchData);
		case "stock-quote":
			return toMarkdownStockQuote(data as StockQuoteData);
		case "search-results":
			return toMarkdownSearchResults(data as SearchResultsData);
		case "browse-directory":
			return toMarkdownBrowseDirectory(data as BrowseDirectoryData);
		case "generic":
			return (data as GenericData).content;
	}
}

// ── Product search ──────────────────────────────────────────────────────────

function toMarkdownProductSearch(data: ProductSearchData): string {
	const parts: string[] = [];
	const platformName = data.platform === "walmart" ? "Walmart" : "Amazon";
	if (data.query) parts.push(`# ${platformName} Search: ${data.query}`);
	else parts.push(`# ${platformName} Results`);
	if (data.totalResults) parts.push(`**Results:** ${data.totalResults}`);
	if (data.results.length > 0) {
		const lines = data.results.map((r) => {
			const meta: string[] = [];
			if (r.position != null) meta.push(`#${r.position}`);
			if (r.price) meta.push(r.currency ? `${r.currency}${r.price}` : r.price);
			if (r.rating) meta.push(`${r.rating}/5`);
			if (r.reviewCount) meta.push(`${r.reviewCount} reviews`);
			if (r.salesRankChange) meta.push(`${r.salesRankChange} sales-rank change`);
			if (r.salesRank) {
				const previous = r.previousSalesRank ? ` (was ${r.previousSalesRank})` : "";
				meta.push(`Sales rank ${r.salesRank}${previous}`);
			}
			if (r.sponsored) meta.push("Sponsored");
			if (r.prime) meta.push("Prime");
			if (r.badge) meta.push(r.badge);
			const metaStr = meta.length > 0 ? ` — ${meta.join(" · ")}` : "";
			const link = r.url ? `[${r.name}](${r.url})` : r.name;
			return `- ${link}${metaStr}`;
		});
		parts.push(lines.join("\n"));
	}
	return clean(parts.join("\n\n"));
}

// ── Lodging search ──────────────────────────────────────────────────────────

function toMarkdownLodgingSearch(data: LodgingSearchData): string {
	const parts: string[] = [];
	const heading = data.destination ? `# ${data.destination}` : "# Search Results";
	parts.push(heading);
	if (data.totalResults) parts.push(`**${data.totalResults} properties found**`);
	if (data.properties.length > 0) {
		const lines = data.properties.map((p: LodgingSearchProperty) => {
			const meta: string[] = [];
			if (p.stars) meta.push(`${"★".repeat(p.stars)}`);
			if (p.rating) meta.push(`${p.rating}${p.ratingLabel ? ` ${p.ratingLabel}` : ""}`);
			if (p.reviewCount) meta.push(`${p.reviewCount} reviews`);
			if (p.location) meta.push(p.location);
			if (p.distance) meta.push(p.distance);
			const metaStr = meta.length > 0 ? ` — ${meta.join(" · ")}` : "";
			const link = p.url ? `[${p.name}](${p.url})` : p.name;
			return `- ${link}${metaStr}`;
		});
		parts.push(lines.join("\n"));
	}
	return clean(parts.join("\n\n"));
}

function toMarkdownStockQuote(data: StockQuoteData): string {
	const parts: string[] = [];
	parts.push(`# ${data.companyName ?? data.symbol} (${data.symbol})`);

	const meta: string[] = [];
	if (data.exchange) meta.push(data.exchange);
	if (data.currency) meta.push(data.currency);
	if (meta.length > 0) parts.push(meta.join(" · "));

	// Price
	if (data.price) {
		let priceLine = `**${data.price}**`;
		if (data.priceChange && data.priceChangePercent) {
			priceLine += ` ${data.priceChange} (${data.priceChangePercent})`;
		}
		parts.push(priceLine);
	}
	if (data.afterHoursPrice) {
		parts.push(`After Hours: ${data.afterHoursPrice}${data.afterHoursChange ? ` ${data.afterHoursChange}` : ""}`);
	}

	// Description
	if (data.description) {
		parts.push(`## About\n\n${data.description}`);
	}

	if (data.sector || data.industry) {
		const tags = [data.sector, data.industry].filter(Boolean).join(" / ");
		parts.push(`**Sector:** ${tags}`);
	}

	// Key stats table
	const s = data.stats;
	const statRows: [string, string | null][] = [
		["Previous Close", s.previousClose],
		["Open", s.open],
		["Bid", s.bid],
		["Ask", s.ask],
		["Day's Range", s.dayRange],
		["52 Week Range", s.yearRange],
		["Volume", s.volume],
		["Avg. Volume", s.avgVolume],
		["Market Cap", s.marketCap],
		["Beta", s.beta],
		["PE Ratio (TTM)", s.peRatio],
		["EPS (TTM)", s.eps],
		["Earnings Date", s.earningsDate],
		["Dividend & Yield", s.forwardDividend],
		["Ex-Dividend Date", s.exDividendDate],
		["1y Target Est", s.oneYearTarget],
	];
	const filledRows = statRows.filter(([, v]) => v != null);
	if (filledRows.length > 0) {
		parts.push("## Key Statistics\n");
		parts.push("| Metric | Value |");
		parts.push("|---|---|");
		for (const [label, value] of filledRows) {
			parts.push(`| ${label} | ${value} |`);
		}
	}

	// Analyst targets
	if (data.analystTargetLow || data.analystTargetAvg || data.analystTargetHigh) {
		const targets: string[] = [];
		if (data.analystTargetLow) targets.push(`Low: ${data.analystTargetLow}`);
		if (data.analystTargetAvg) targets.push(`Average: ${data.analystTargetAvg}`);
		if (data.analystTargetHigh) targets.push(`High: ${data.analystTargetHigh}`);
		parts.push(`## Analyst Price Targets\n\n${targets.join(" · ")}`);
	}

	return clean(parts.join("\n\n"));
}

// ── Search results ──────────────────────────────────────────────────────────

function toMarkdownSearchResults(data: SearchResultsData): string {
	const parts: string[] = [];
	const engineNameMap: Record<SearchResultsData["engine"], string> = {
		google: "Google",
		bing: "Bing",
		duckduckgo: "DuckDuckGo",
		brave: "Brave",
		youtube: "YouTube",
		facebook: "Facebook Marketplace",
		ebay: "eBay",
		yelp: "Yelp",
		"yahoo-finance": "Yahoo Finance",
		crunchbase: "Crunchbase",
		npm: "npm",
		pypi: "PyPI",
		"docker-hub": "Docker Hub",
		crates: "crates.io",
		rubygems: "RubyGems",
		documentation: "Documentation",
		packagist: "Packagist",
		hex: "Hex",
		metacpan: "MetaCPAN",
		"maven-central": "Maven Central",
		nuget: "NuGet",
		hackage: "Hackage",
		pubdev: "pub.dev",
		jsr: "JSR",
		"swift-package-index": "Swift Package Index",
	};
	const engineName = engineNameMap[data.engine];
	if (data.query) {
		parts.push(`# ${engineName} Search: ${data.query}`);
	} else {
		parts.push(`# ${engineName} Search Results`);
	}

	if (data.featuredSnippet) {
		parts.push(`## Featured Snippet`);
		parts.push(data.featuredSnippet.text);
		if (data.featuredSnippet.source) {
			const sourceStr = data.featuredSnippet.sourceUrl
				? `[${data.featuredSnippet.source}](${data.featuredSnippet.sourceUrl})`
				: data.featuredSnippet.source;
			parts.push(`*Source: ${sourceStr}*`);
		}
	}

	if (data.results.length > 0) {
		parts.push(`## Results`);
		const lines = data.results.map((r) => {
			const link = `[${r.title}](${r.url})`;
			const meta: string[] = [];
			if (r.location) meta.push(r.location);
			if (r.rank) meta.push(`Rank ${r.rank}`);
			if (r.rating) meta.push(`${r.rating}/5`);
			if (r.reviewCount) meta.push(`${r.reviewCount} reviews`);
			if (r.price) meta.push(r.price);
			if (r.category) meta.push(r.category);
			if (r.exchange) meta.push(r.exchange);
			if (r.resultType) meta.push(r.resultType);
			if (r.version) meta.push(`v${r.version}`);
			if (r.author) meta.push(r.author);
			if (r.license) meta.push(r.license);
			if (r.dependents) meta.push(`${r.dependents} dependents`);
			if (r.downloads) meta.push(`${r.downloads} downloads`);
			if (r.publishedDate) meta.push(r.publishedDate);
			const metaStr = meta.length > 0 ? `\n  ${meta.join(" · ")}` : "";
			const snippetStr = r.snippet ? `\n  ${r.snippet}` : "";
			return `${r.position}. ${link}${metaStr}${snippetStr}`;
		});
		parts.push(lines.join("\n\n"));
	}

	if (data.relatedSearches && data.relatedSearches.length > 0) {
		parts.push(`## Related Searches`);
		parts.push(data.relatedSearches.map((s) => `- ${s}`).join("\n"));
	}

	return clean(parts.join("\n\n"));
}

function toMarkdownBrowseDirectory(data: BrowseDirectoryData): string {
	const parts: string[] = [];
	parts.push(`# Amazon Browse${data.name ? `: ${data.name}` : ""}`);

	if (data.refinements.length > 0) {
		const groups = data.refinements.map((group) => {
			const lines: string[] = [];
			lines.push(`### ${group.title}`);
			if (group.current) lines.push(`Current: ${group.current}`);
			if (group.options.length > 0) {
				lines.push(
					group.options
						.map((option) => {
							const label = option.url ? `[${option.label}](${option.url})` : option.label;
							return `- ${label}`;
						})
						.join("\n"),
				);
			}
			return lines.join("\n\n");
		});
		parts.push(`## Refinements\n\n${groups.join("\n\n")}`);
	}

	if (data.sections.length > 0) {
		const kindLabel: Record<BrowseDirectoryData["sections"][number]["kind"], string> = {
			"visual-nav": "Visual Navigation",
			showcase: "Showcase",
			herotator: "Promotions",
			"horizontal-editorial": "Editorial",
			"content-grid": "Browse Grid",
		};
		const sectionBlocks = data.sections.map((section) => {
			const heading = section.title ?? kindLabel[section.kind];
			const lines = section.items.map((item) => {
				const link = item.url ? `[${item.title}](${item.url})` : item.title;
				return item.details ? `- ${link} — ${item.details}` : `- ${link}`;
			});
			return `## ${heading}\n\n${lines.join("\n")}`;
		});
		parts.push(sectionBlocks.join("\n\n"));
	}

	return clean(parts.join("\n\n"));
}
