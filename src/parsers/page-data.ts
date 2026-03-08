/**
 * page-data.ts — Discriminated union of all structured page types
 * returned by specific parsers in the web-unlocker service.
 */

interface PageDataBase {
	type: string;
	title: string | null;
	url: string;
}

// ── News / blog article ──────────────────────────────────────────────────────

export interface ArticleData extends PageDataBase {
	type: "article";
	headline: string | null;
	author: string | null;
	datePublished: string | null;
	content: string; // body text (plain text or markdown)
}

// ── Video (YouTube, Vimeo) ───────────────────────────────────────────────────

export interface VideoComment {
	id: string | null;
	author: string | null;
	text: string;
	likes: number | null;
	replyCount: number | null;
	date: string | null;
}

export interface VideoData extends PageDataBase {
	type: "video";
	platform: "youtube" | "vimeo";
	channel: string | null; // channel/creator name
	channelUrl: string | null;
	uploadDate: string | null; // ISO date string
	duration: string | null; // ISO 8601 duration e.g. "PT4M32S"
	viewCount: number | null;
	likeCount: number | null;
	genre?: string | null; // YouTube category
	description: string | null; // full video description
	subscriberCount?: string | null; // channel pages only, e.g. "1.06M subscribers"
	videoCount?: string | null; // channel pages only, e.g. "1.2K videos"
	joinedDate?: string | null; // channel pages only, e.g. "Jun 21, 2008"
	country?: string | null; // channel pages only, e.g. "United States"
	channelLinks?: string[]; // channel pages only, external links from About tab
	comments?: VideoComment[]; // YouTube video comments
	handle?: string | null; // YouTube channel @handle
	bannerUrl?: string | null; // YouTube channel banner image URL
	profileImageUrl?: string | null; // YouTube channel profile/avatar image URL
}

// ── Product (Amazon, eBay, Walmart, Target, Etsy) ────────────────────────────

export interface ProductData extends PageDataBase {
	type: "product";
	platform: "amazon" | "ebay" | "walmart" | "target" | "etsy" | "producthunt" | "facebook" | null;
	name: string | null;
	brand?: string | null;
	sku?: string | null; // ASIN on Amazon
	price?: string | null; // raw price value
	currency?: string | null; // currency code or symbol
	availability?: string | null;
	condition?: string | null; // eBay: "New", "Used", etc.
	categories?: string[];
	location?: string | null;
	listedDate?: string | null;
	rating?: string | null; // e.g. "4.5"
	reviewCount?: string | null;
	totalRatingCount?: string | null; // total global ratings (may differ from reviewCount)
	ratingHistogram?: RatingHistogramEntry[];
	topReviews?: ProductReview[];
	features?: string[]; // bullet points
	specifications?: { key: string; value: string }[];
	description: string | null; // rendered HTML description (markdown)
	seller?: string | null; // Amazon: seller/merchant name
	gtin?: string | null; // Walmart: GTIN/UPC barcode
	images?: string[]; // product image URLs
}

// ── Repository (GitHub, GitLab) ──────────────────────────────────────────────

export interface IssueComment {
	author: string | null;
	body: string;
}

export interface IssueData {
	title: string;
	issueType: "issue" | "mr" | null; // GitLab: Issue vs Merge Request
	state: string | null;
	body: string | null;
	comments: IssueComment[];
}

export interface RepoData extends PageDataBase {
	type: "repo";
	platform: "github" | "gitlab";
	description: string | null;
	stars: string | null;
	forks: string | null;
	topics?: string[];
	language?: string | null; // GitLab: programming language
	repositoryUrl?: string | null; // GitLab: code repository URL
	readmeContent: string | null;
	issue: IssueData | null; // populated for issue/PR pages
}

// ── Q&A (StackOverflow, HackerNews story, Quora) ─────────────────────────────

export interface QaAnswer {
	body: string;
	votes: number | null;
	isAccepted: boolean;
}

export interface QaData extends PageDataBase {
	type: "qa";
	platform: "stackoverflow" | "hackernews" | "quora";
	question: {
		text: string | null;
		votes: number | null;
	};
	answers: QaAnswer[];
}

// ── Package (npm, PyPI, Crates, RubyGems) ────────────────────────────────────

export interface PackageData extends PageDataBase {
	type: "package";
	registry: "npm" | "pypi" | "crates" | "rubygems" | "packagist" | "hex" | "metacpan" | "maven-central" | "nuget" | "hackage" | "pubdev" | "cocoapods" | "jsr" | "swift-package-index";
	name: string | null;
	version: string | null;
	description: string | null;
	author: string | null;
	license: string | null;
	keywords: string[];
	repository: string | null;
	homepage: string | null;
	installCommand: string | null;
}

export interface ContainerImageData extends PageDataBase {
	type: "container-image";
	registry: "docker-hub";
	namespace: string | null;
	image: string | null;
	official: boolean;
	description: string | null;
	pulls: string | null;
	stars: string | null;
	categories: string[];
	overview: string | null;
	sourceRepository: string | null;
}

// ── Academic paper (arXiv, PubMed, Semantic Scholar) ─────────────────────────

export interface PaperData extends PageDataBase {
	type: "paper";
	paperTitle: string | null;
	authors: string[];
	abstract: string | null;
	dateSubmitted: string | null;
	subjects: string | null;
	comments: string | null; // arXiv comments field (e.g. "22 pages, 4 figures")
	journalRef: string | null;
	pdfUrl: string | null;
}

// ── Film / TV show (IMDB) ────────────────────────────────────────────────────

export interface FilmCastEntry {
	actor: string;
	character: string | null;
}

export interface FilmReview {
	name: string | null;
	author: string | null;
	body: string;
}

export interface FilmData extends PageDataBase {
	type: "film";
	platform: "imdb" | "rottentomatoes" | "metacritic";
	contentType: string | null; // Movie, TVSeries, TVEpisode, etc. (not Person — use ImdbPersonData)
	description: string | null;
	contentRating: string | null; // R, PG-13, etc.
	rating: string | null; // e.g. "7.8" (IMDB), "93" (RT Tomatometer), "90" (Metascore)
	ratingCount: string | null;
	audienceScore?: string | null; // RT audience/popcornmeter score, IMDB: null
	genre: string[];
	keywords?: string | null; // formatted comma-separated keywords
	actorList: string | null; // comma-separated from JSON-LD (fallback when no DOM cast)
	cast: FilmCastEntry[]; // actor+character from DOM
	director: string | null;
	writers?: string | null;
	datePublished: string | null;
	duration?: string | null; // ISO 8601 e.g. "PT2H22M"
	metacriticScore?: string | null;
	boxOffice?: { budget: string | null; grossDomestic: string | null; openingWeekend: string | null };
	techSpecs?: { runtime: string | null; color: string | null; sound: string | null; aspectRatio: string | null };
	details?: { releaseDate: string | null; country: string | null; languages: string[]; akas: string | null };
	review?: FilmReview | null;
}

// ── IMDB person / celebrity ──────────────────────────────────────────────────

export interface ImdbPersonData extends PageDataBase {
	type: "film-person";
	name: string | null;
	bio: string | null;
	occupation: string | null; // e.g. "Actor, Director"
	birthDate: string | null;
}

// ── Company / organization page ───────────────────────────────────────────────

export interface CompanyPost {
	text: string; // the card author's own commentary
	resharedText: string | null; // inner reshared post's text, when this card is a reshare
	headline: string | null; // article title or post headline (LinkedIn JSON-LD "headline")
	url: string | null;
	datePublished: string | null; // ISO 8601
	reactions: string | null; // e.g. "718"
	comments: string | null; // e.g. "96"
}

export interface CompanyEmployee {
	name: string;
	profileUrl: string | null;
}

export interface SimilarPage {
	name: string;
	description: string | null;
	url: string | null;
}

export interface CompanyJobListing {
	jobTitle: string;
	location: string | null;
	salary: string | null;
	datePosted: string | null; // ISO date or relative (e.g. "4 hours ago")
	jobUrl: string | null;
}

export interface CompanyCultureBlock {
	heading: string;
	body: string;
	linkUrl: string | null;
}

export interface CompanyData extends PageDataBase {
	type: "company";
	platform: "linkedin" | "indeed" | "glassdoor" | "wellfound" | "crunchbase" | "walmart" | "facebook";
	name: string | null;
	tagline?: string | null; // one-liner pitch (LinkedIn: slogan)
	description: string | null;
	industry?: string | null;
	employeeCount?: string | null; // e.g. "2-10 employees"
	companyType?: string | null; // "Public", "Private", "Self-Owned", etc.
	headquarters?: string | null;
	website?: string | null;
	founded?: string | null;
	specialties?: string[];
	followers?: string | null; // e.g. "1,234 followers"
	logoUrl?: string | null;
	rating?: string | null; // Glassdoor company rating
	reviewCount?: string | null; // Glassdoor review count
	employees?: CompanyEmployee[]; // visible employees on company page
	similarPages?: SimilarPage[]; // similar/related companies
	posts?: CompanyPost[]; // recent feed posts/activity
	workHappinessScore?: string | null; // Indeed: "X% of people" happiness percentage
	// ── Sub-page content (LinkedIn /jobs/, /life/) ──
	jobListings?: CompanyJobListing[];
	cultureBlocks?: CompanyCultureBlock[];
	companyPhotos?: string[];
	// ── Crunchbase-specific (optional) ──
	legalName?: string | null;
	aliases?: string[];
	operatingStatus?: string | null;
	founders?: string[];
	investors?: string[];
	boardMembers?: string[];
	fundingRounds?: string | null; // e.g. "13"
	lastFundingType?: string | null; // e.g. "Venture - Series Unknown"
	contactEmail?: string | null;
	phone?: string | null;
	companyId?: string | null; // LinkedIn company slug or numeric ID
}

// ── Individual person profile (LinkedIn) ─────────────────────────────────────

export interface ProfileExperience {
	role: string;
	company: string;
	dateRange: string | null;
}

export interface ProfileEducation {
	school: string;
	degree: string | null;
	dateRange: string | null;
}

export interface ProfileArticle {
	title: string;
	url: string | null;
	date: string | null;
	snippet: string | null;
	reactions: string | null;
	comments: string | null;
}

export interface PersonProfileData extends PageDataBase {
	type: "person";
	platform: "linkedin";
	name: string | null;
	headline: string | null; // current title / professional tagline
	location: string | null;
	bio: string | null; // about / description text
	followers: string | null; // e.g. "11,873,531 followers"
	connections: string | null; // e.g. "500+ connections"
	experience: ProfileExperience[];
	education: ProfileEducation[];
	articles: ProfileArticle[]; // LinkedIn Pulse articles
	posts: CompanyPost[]; // recent activity/posts (DiscussionForumPosting JSON-LD, includes reactions)
	profileId?: string | null; // LinkedIn public profile slug from URL
}

// ── Social profile (Instagram, TikTok, Facebook) ────────────────────────────

export interface SocialProfileData extends PageDataBase {
	type: "social-profile";
	platform: "instagram" | "tiktok" | "facebook";
	name: string | null;
	handle: string | null;
	bio: string | null;
	followers?: string | null;
	following?: string | null;
	postCount?: string | null;
	likeCount?: string | null;
	verified?: boolean;
	profileImageUrl?: string | null;
	externalUrl?: string | null;
	category?: string | null;
	posts?: CompanyPost[];
}

// ── Event (Facebook) ────────────────────────────────────────────────────────

export interface EventData extends PageDataBase {
	type: "event";
	platform: "facebook";
	eventName: string | null;
	startDate: string | null;
	location: string | null;
	description: string | null;
	organizer?: string | null;
	peopleResponded?: string | null;
	duration?: string | null;
	privacy?: string | null;
	eventId?: string | null;
	imageUrl?: string | null;
}

// ── Job posting ───────────────────────────────────────────────────────────────

export interface JobPostingData extends PageDataBase {
	type: "job";
	platform: "linkedin" | "indeed" | "glassdoor" | "wellfound";
	jobTitle: string | null;
	company: string | null;
	location: string | null;
	salary: string | null;
	employmentType: string | null;
	datePosted: string | null;
	description: string | null;
	applyUrl: string | null;
	seniorityLevel?: string | null; // e.g. "Mid-Senior level", "Entry level"
	jobId?: string | null; // platform-specific job identifier
}

// ── Social (Reddit, HackerNews front page, Twitter) ──────────────────────────

export interface SocialPost {
	title: string;
	url: string;
	score?: string | null;
	author: string | null;
	date: string | null; // relative age for HN, ISO date for Reddit
	comments: string | null;
	domain?: string | null;
	isSticky: boolean;
	// ── Twitter-specific (optional) ──
	tweetId?: string | null;
	mediaUrls?: string[]; // photo/video URLs in tweet
	quotedPost?: { author: string | null; text: string; url: string | null } | null;
	isVerified?: boolean;
}

export interface SocialComment {
	author: string | null;
	score: string | null;
	date?: string | null;
	body: string;
}

export interface SocialPostDetail {
	title: string;
	url: string | null; // external URL for link posts
	score?: string | null;
	body: string | null;
	author: string | null;
	subreddit?: string | null;
	domain?: string | null;
	commentCount: string | null;
	date: string | null;
	authorHandle?: string | null;
	likeCount?: string | null;
	shareCount?: string | null;
	viewCount?: string | null;
	mediaUrls?: string[];
	videoUrl?: string | null;
	quotedPost?: { author: string | null; text: string; url: string | null } | null;
}

export interface SocialData extends PageDataBase {
	type: "social";
	platform: "reddit" | "hackernews" | "twitter" | "instagram" | "tiktok" | "facebook" | "linkedin";
	sectionTitle: string | null; // section heading text (without #)
	description: string | null; // sidebar/context description (Reddit)
	posts?: SocialPost[];
	post: SocialPostDetail | null; // single post page
	comments: SocialComment[];
	profileImageUrl?: string | null; // Twitter profile image URL
	isProfileVerified?: boolean; // Twitter: profile-level verification status
}

// ── Wiki (Wikipedia, Fandom) ─────────────────────────────────────────────────

export interface WikiData extends PageDataBase {
	type: "wiki";
	content: string;
}

// ── Documentation site ───────────────────────────────────────────────────────

export interface DocumentationData extends PageDataBase {
	type: "documentation";
	breadcrumb: string | null;
	version: string | null;
	content: string;
}

// ── Lodging (Booking.com) ────────────────────────────────────────────────────

export interface LodgingData extends PageDataBase {
	type: "lodging";
	name: string | null;
	description: string | null;
	address: string | null;
	rating: string | null;
	reviewCount: string | null; // null when rating comes from DOM (no structured count)
	amenities: string[];
	// ── Airbnb-specific (optional) ──
	listingId?: string | null;
	propertyType?: string | null; // "Entire home", "Private room", etc.
	price?: string | null; // nightly price
	guests?: string | null; // "4 guests"
	bedrooms?: string | null; // "2 bedrooms"
	beds?: string | null; // "2 beds"
	bathrooms?: string | null; // "1 bathroom"
	hostName?: string | null;
	hostIsSuperhost?: boolean;
	hostYearsHosting?: string | null;
	hostAbout?: string | null;
	hostResponseRate?: string | null;
	highlights?: string[]; // e.g. "Self check-in", "Great location"
	houseRules?: string[];
	safetyItems?: string[];
	categoryRatings?: { category: string; rating: string }[];
	neighborhoodHighlights?: string | null;
	images?: string[];
	latitude?: number | null;
	longitude?: number | null;
	// ── Booking-specific (optional) ──
	hotelId?: string | null;
}

// ── Book (Goodreads) ─────────────────────────────────────────────────

export interface BookData extends PageDataBase {
	type: "book";
	name: string | null;
	author: string | null;
	rating: string | null;
	ratingCount: string | null;
	reviewCount: string | null;
	description: string | null;
	isbn: string | null;
	pageCount: string | null;
	publishDate: string | null;
	publisher: string | null;
	genres: string[];
	series: string | null;
	coverUrl: string | null;
}

// ── App (Apple App Store) ────────────────────────────────────────────────────

export interface AppData extends PageDataBase {
	type: "app";
	platform: "appstore" | "playstore";
	name: string | null;
	developer: string | null;
	price: string | null;
	rating: string | null;
	ratingCount: string | null;
	description: string | null;
	category: string | null;
	version: string | null;
	size: string | null;
	compatibility: string | null;
	releaseDate: string | null;
	whatsNew: string | null;
	screenshotUrls: string[];
}

// ── Music (Spotify) ─────────────────────────────────────────────────────────

export interface MusicTrackListEntry {
	name: string;
	artist: string;
	duration: string | null;
}

export interface MusicData extends PageDataBase {
	type: "music";
	platform: "spotify";
	name: string | null;
	artist: string | null;
	album: string | null;
	releaseDate: string | null;
	duration: string | null;
	trackNumber: number | null;
	genre?: string[];
	previewUrl: string | null;
	albumArt: string | null;
	playCount: string | null;
	monthlyListeners: string | null;
	bio: string | null;
	trackList: MusicTrackListEntry[];
}

// ── Local Business (Yelp) ─────────────────────────────────────────────────────

export interface BusinessReview {
	author: string | null;
	rating: string | null;
	date: string | null;
	body: string;
	reviewId?: string | null;
	title?: string | null;
	jobTitle?: string | null;
	employmentStatus?: string | null;
	location?: string | null;
	pros?: string | null;
	cons?: string | null;
	advice?: string | null;
	lengthOfEmployment?: number | null;
	helpfulCount?: number | null;
	subRatings?: { category: string; rating: number }[];
	images?: string[];
}

export interface BusinessData extends PageDataBase {
	type: "business";
	name: string | null;
	rating: string | null;
	reviewCount: string | null;
	priceRange?: string | null;
	categories?: string[];
	address?: string | null;
	phone?: string | null;
	website?: string | null;
	hours?: { day: string; time: string }[];
	amenities?: string[];
	photoCount?: string | null;
	description: string | null;
	reviews: BusinessReview[];
	businessId?: string | null; // platform-specific business identifier
}

// ── Real estate property (Zillow) ─────────────────────────────────────────────

export interface PropertyPriceHistoryEntry {
	date: string | null;
	event: string | null; // "Sold", "Listed for sale", "Price change"
	price: string | null; // "$450,000"
	priceChangeRate?: string | null; // "+5.2%"
	source?: string | null; // "MLS", "Public Record"
}

export interface PropertyData extends PageDataBase {
	type: "property";
	address: string | null;
	price: string | null;
	bedrooms: number | null;
	bathrooms: number | null;
	squareFeet: number | null;
	lotSize: string | null;
	yearBuilt: number | null;
	propertyType: string | null; // "Single Family", "Condo", etc.
	status: string | null; // "For Sale", "Sold", "Pending"
	description: string | null;
	features: string[];
	zestimate: string | null;
	taxHistory: string | null;
	agent: string | null;
	zpid?: string | null; // Zillow property ID
	priceHistory?: PropertyPriceHistoryEntry[];
	images?: string[]; // property photo URLs
}

export interface ProductReview {
	author: string | null;
	rating: string | null;
	date: string | null;
	title: string | null;
	body: string;
	helpfulVotes: string | null;
	verified: boolean;
	variant: string | null;
}

export interface RatingHistogramEntry {
	stars: number; // 1-5
	percentage: number; // 0-100
}

// ── Product search (Amazon) ─────────────────────────────────────────────────

export interface ProductSearchResult {
	position?: number | null;
	asin?: string | null;
	name: string;
	url: string | null;
	price: string | null;
	currency: string | null;
	listPrice: string | null;
	rating: string | null;
	reviewCount: string | null;
	imageUrl: string | null;
	sponsored: boolean;
	prime?: boolean;
	badge: string | null;
	boughtRecently?: string | null;
	salesRank?: string | null;
	previousSalesRank?: string | null;
	salesRankChange?: string | null;
}

export interface ProductSearchData extends PageDataBase {
	type: "product-search";
	platform: "amazon" | "walmart";
	query: string | null;
	totalResults?: string | null;
	results: ProductSearchResult[];
}

// ── Lodging search (Booking.com) ─────────────────────────────────────────────

export interface LodgingSearchProperty {
	name: string;
	url: string | null;
	stars: number | null;
	rating: string | null;
	ratingLabel: string | null;
	reviewCount: string | null;
	location: string | null;
	distance: string | null;
	locationScore: string | null;
	description: string | null;
	imageUrl: string | null;
}

export interface LodgingSearchData extends PageDataBase {
	type: "lodging-search";
	destination: string | null;
	totalResults: string | null;
	checkIn?: string | null;
	checkOut?: string | null;
	adults?: number | null;
	children?: number | null;
	rooms?: number | null;
	properties: LodgingSearchProperty[];
}

// ── Stock / financial quote ──────────────────────────────────────────────────

export interface StockQuoteStats {
	previousClose: string | null;
	open: string | null;
	bid: string | null;
	ask: string | null;
	dayRange: string | null;
	yearRange: string | null;
	volume: string | null;
	avgVolume: string | null;
	marketCap: string | null;
	beta: string | null;
	peRatio: string | null;
	eps: string | null;
	earningsDate: string | null;
	forwardDividend: string | null;
	exDividendDate: string | null;
	oneYearTarget: string | null;
}

export interface StockQuoteData extends PageDataBase {
	type: "stock-quote";
	symbol: string;
	companyName: string | null;
	exchange: string | null;
	currency: string | null;
	price: string | null;
	priceChange: string | null;
	priceChangePercent: string | null;
	afterHoursPrice: string | null;
	afterHoursChange: string | null;
	sector: string | null;
	industry: string | null;
	description: string | null;
	stats: StockQuoteStats;
	analystTargetLow: string | null;
	analystTargetAvg: string | null;
	analystTargetHigh: string | null;
}

// ── Generic NHM fallback ─────────────────────────────────────────────────────

// ── Search results ──────────────────────────────────────────────────────────

export interface SearchResult {
	position: number;
	title: string;
	url: string;
	snippet: string | null;
	displayUrl?: string;
	location?: string | null;
	rank?: string | null;
	rating?: string | null;
	reviewCount?: string | null;
	imageUrl?: string | null;
	price?: string | null;
	category?: string | null;
	resultType?: string | null;
	exchange?: string | null;
	version?: string | null;
	author?: string | null;
	license?: string | null;
	dependents?: string | null;
	downloads?: string | null;
	publishedDate?: string | null;
}

export interface SearchResultsData extends PageDataBase {
	type: "search-results";
	engine: "google" | "bing" | "duckduckgo" | "brave" | "youtube" | "yelp" | "yahoo-finance" | "crunchbase" | "facebook" | "ebay" | "npm" | "pypi" | "docker-hub" | "crates" | "rubygems" | "documentation" | "packagist" | "hex" | "metacpan" | "maven-central" | "nuget" | "hackage" | "pubdev" | "jsr" | "swift-package-index";
	query: string | null;
	results: SearchResult[];
	featuredSnippet?: {
		text: string;
		source?: string;
		sourceUrl?: string;
	} | null;
	relatedSearches?: string[];
}

export interface BrowseDirectoryRefinementOption {
	label: string;
	url: string | null;
}

export interface BrowseDirectoryRefinementGroup {
	title: string;
	current?: string | null;
	options: BrowseDirectoryRefinementOption[];
}

export interface BrowseDirectorySectionItem {
	title: string;
	url: string | null;
	imageUrl?: string | null;
	details?: string | null;
}

export interface BrowseDirectorySection {
	kind: "visual-nav" | "showcase" | "herotator" | "horizontal-editorial" | "content-grid";
	title?: string | null;
	items: BrowseDirectorySectionItem[];
}

export interface BrowseDirectoryData extends PageDataBase {
	type: "browse-directory";
	platform: "amazon";
	name: string | null;
	refinements: BrowseDirectoryRefinementGroup[];
	sections: BrowseDirectorySection[];
}

export interface GenericData extends PageDataBase {
	type: "generic";
	content: string;
}

// ── Union ────────────────────────────────────────────────────────────────────

export type PageData =
	| ArticleData
	| VideoData
	| ProductData
	| RepoData
	| QaData
	| PackageData
	| ContainerImageData
	| PaperData
	| FilmData
	| ImdbPersonData
	| CompanyData
	| PersonProfileData
	| SocialProfileData
	| EventData
	| JobPostingData
	| SocialData
	| WikiData
	| DocumentationData
	| LodgingData
	| BookData
	| AppData
	| MusicData
	| BusinessData
	| PropertyData
	| ProductSearchData
	| LodgingSearchData
	| StockQuoteData
	| SearchResultsData
	| BrowseDirectoryData
	| GenericData;
