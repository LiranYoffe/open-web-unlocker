import { parseAirbnb } from "./airbnb";
import { parseAmazon } from "./amazon";
import { parseAmazonBrowse } from "./amazon-browse";
import { parseAmazonSearch } from "./amazon-search";
import { parseAmazonSeller } from "./amazon-sellers";
import { parseAppStore } from "./appstore";
import { parseArxiv } from "./arxiv";
import { parseBooking } from "./booking";
import { parseBookingSearch } from "./booking-search";
import { parseBraveSearch } from "./brave-search";
import { parseCrunchbase } from "./crunchbase";
import { parseCocoaPods } from "./cocoapods";
import { parseDocsDevsite } from "./docs-devsite";
import { parseDocsDocusaurus } from "./docs-docusaurus";
import { parseDocsMdn } from "./docs-mdn";
import { parseDocsMkdocs } from "./docs-mkdocs";
import { parseDocsNextjs } from "./docs-nextjs";
import { parseDocsSite } from "./docs-site";
import { parseDocsSphinx } from "./docs-sphinx";
import { parseDocsVitepress } from "./docs-vitepress";
import { parseDockerHub } from "./docker-hub";
import { parseDuckDuckGo } from "./duckduckgo";
import { parseEbay } from "./ebay";
import { parseEtsy } from "./etsy";
import { parseFacebook } from "./facebook";
import { parseFandom } from "./fandom";
import { parseGeneric } from "./generic";
import { parseGlassdoorReviews } from "./glassdoor-reviews";
import { parseGoodreads } from "./goodreads";
import { parseGitHub } from "./github";
import { parseGitLab } from "./gitlab";
import { parseGlassdoor } from "./glassdoor";
import { parseGoogle } from "./google";
import { parseHackerNews } from "./hackernews";
import { parseHackage } from "./hackage";
import { parseHex } from "./hex";
import { parseImdb } from "./imdb";
import { parseIndeed } from "./indeed";
import { parseInstagram } from "./instagram";
import { parseJsr } from "./jsr";
import { parseLinkedIn } from "./linkedin";
import { parseMavenCentral } from "./maven-central";
import { parseMetacritic } from "./metacritic";
import { parseMetacpan } from "./metacpan";
import { parseNewsArticle } from "./news-article";
import { parseNpm } from "./npm";
import { parseNuget } from "./nuget";
import { parsePackagist } from "./packagist";
import type { PageData } from "./page-data";
import { parsePubMed } from "./pubmed";
import { parsePypi } from "./pypi";
import { parseBing } from "./bing";
import { parseCrates } from "./crates";
import { parseRubyGems } from "./rubygems";
import { parseQuora } from "./quora";
import { parseSemanticScholar } from "./semantic-scholar";
import { parseReddit } from "./reddit";
import { parseRottenTomatoes } from "./rottentomatoes";
import { parseSpotify } from "./spotify";
import { parseStackOverflow } from "./stackoverflow";
import { parseTarget } from "./target";
import { parseTiktok } from "./tiktok";
import { parseTripAdvisor } from "./tripadvisor";
import { parseTwitter } from "./twitter";
import { parseVimeo } from "./vimeo";
import { parseWalmart } from "./walmart";
import { parseWalmartSeller } from "./walmart-sellers";
import { parseWellfound } from "./wellfound";
import { parseYahooFinance } from "./yahoo-finance";
import { parseWikipedia } from "./wikipedia";
import { parseYelp } from "./yelp";
import { parseYouTube } from "./youtube";
import { parseZillow } from "./zillow";
import { parsePlayStore } from "./playstore";
import { parseProductHunt } from "./producthunt";
import { parsePubDev } from "./pubdev";
import { parseSwiftPackageIndex } from "./swift-package-index";
import { parseTrustpilot } from "./trustpilot";

type Parser = (html: string, url: string) => PageData;

const INHERITED_PARSER_PREFIXES: Array<[prefix: string, parser: Parser]> = [
	["generic-", parseGeneric],
	["docs-nextjs-", parseDocsNextjs],
	["docs-mdn-", parseDocsMdn],
	["docs-devsite-", parseDocsDevsite],
	["docs-sphinx-", parseDocsSphinx],
	["docs-mkdocs-", parseDocsMkdocs],
	["docs-vitepress-", parseDocsVitepress],
	["docs-docusaurus-", parseDocsDocusaurus],
	["docs-site-", parseDocsSite],
] as const;

function resolveInheritedParserHint(parserHint?: string): Parser | null {
	if (!parserHint) return null;
	for (const [prefix, parser] of INHERITED_PARSER_PREFIXES) {
		if (parserHint.startsWith(prefix)) return parser;
	}
	return null;
}

export { parseGeneric };

const PARSER_REGISTRY: Record<string, Parser> = {
	crunchbase: parseCrunchbase,
	github: parseGitHub,
	gitlab: parseGitLab,
	stackoverflow: parseStackOverflow,
	wikipedia: parseWikipedia,
	reddit: parseReddit,
	hackernews: parseHackerNews,
	"news-article": parseNewsArticle,
	"docs-site": parseDocsSite,
	"docs-docusaurus": parseDocsDocusaurus,
	"docs-vitepress": parseDocsVitepress,
	"docs-mkdocs": parseDocsMkdocs,
	"docs-sphinx": parseDocsSphinx,
	"docs-devsite": parseDocsDevsite,
	"docs-mdn": parseDocsMdn,
	"docs-nextjs": parseDocsNextjs,
	cocoapods: parseCocoaPods,
	jsr: parseJsr,
	"docker-hub": parseDockerHub,
	youtube: parseYouTube,
	amazon: parseAmazon,
	"amazon-browse": parseAmazonBrowse,
	"amazon-search": parseAmazonSearch,
	"amazon-sellers": parseAmazonSeller,
	imdb: parseImdb,
	rottentomatoes: parseRottenTomatoes,
	metacritic: parseMetacritic,
	fandom: parseFandom,
	quora: parseQuora,
	twitter: parseTwitter,
	linkedin: parseLinkedIn,
	ebay: parseEbay,
	walmart: parseWalmart,
	"walmart-sellers": parseWalmartSeller,
	target: parseTarget,
	etsy: parseEtsy,
	facebook: parseFacebook,
	airbnb: parseAirbnb,
	booking: parseBooking,
	"booking-search": parseBookingSearch,
	npm: parseNpm,
	pubdev: parsePubDev,
	"swift-package-index": parseSwiftPackageIndex,
	nuget: parseNuget,
	pypi: parsePypi,
	crates: parseCrates,
	rubygems: parseRubyGems,
	packagist: parsePackagist,
	hackage: parseHackage,
	hex: parseHex,
	metacpan: parseMetacpan,
	"maven-central": parseMavenCentral,
	arxiv: parseArxiv,
	pubmed: parsePubMed,
	"semantic-scholar": parseSemanticScholar,
	vimeo: parseVimeo,
	indeed: parseIndeed,
	glassdoor: parseGlassdoor,
	"glassdoor-reviews": parseGlassdoorReviews,
	instagram: parseInstagram,
	tiktok: parseTiktok,
	wellfound: parseWellfound,
	goodreads: parseGoodreads,
	appstore: parseAppStore,
	spotify: parseSpotify,
	tripadvisor: parseTripAdvisor,
	trustpilot: parseTrustpilot,
	producthunt: parseProductHunt,
	yelp: parseYelp,
	zillow: parseZillow,
	playstore: parsePlayStore,
	"yahoo-finance": parseYahooFinance,
	// Search engines
	google: parseGoogle,
	bing: parseBing,
	duckduckgo: parseDuckDuckGo,
	"brave-search": parseBraveSearch,
	generic: parseGeneric,
};

function mapDomains(hosts: readonly string[], parser: Parser): Record<string, Parser> {
	return Object.fromEntries(hosts.map((host) => [host, parser])) as Record<string, Parser>;
}

const WIKIPEDIA_HOSTS = [
	"en.wikipedia.org",
	"fr.wikipedia.org",
	"de.wikipedia.org",
	"es.wikipedia.org",
	"ja.wikipedia.org",
	"pt.wikipedia.org",
	"ru.wikipedia.org",
	"it.wikipedia.org",
	"zh.wikipedia.org",
	"ar.wikipedia.org",
	"nl.wikipedia.org",
	"pl.wikipedia.org",
	"ko.wikipedia.org",
	"sv.wikipedia.org",
	"uk.wikipedia.org",
	"vi.wikipedia.org",
	"en.wikiversity.org",
	"en.wikibooks.org",
	"en.wikisource.org",
] as const;

const NEWS_ARTICLE_HOSTS = [
	"cnn.com",
	"bbc.com",
	"bbc.co.uk",
	"nytimes.com",
	"theguardian.com",
	"espn.com",
	"msn.com",
	"yahoo.com",
	"yahoo.co.jp",
	"news.yahoo.co.jp",
	"globo.com",
	"cricbuzz.com",
	"reuters.com",
	"apnews.com",
	"bloomberg.com",
	"washingtonpost.com",
	"ft.com",
	"economist.com",
	"forbes.com",
	"techcrunch.com",
	"wired.com",
	"arstechnica.com",
	"theatlantic.com",
	"politico.com",
	"time.com",
	"usatoday.com",
	"wsj.com",
	"independent.co.uk",
	"dailymail.co.uk",
	"thetimes.co.uk",
	"lemonde.fr",
	"spiegel.de",
	"elpais.com",
	"dev.to",
	"hashnode.com",
	"substack.com",
	"medium.com",
] as const;

const AMAZON_HOSTS = [
	"amazon.com",
	"amazon.in",
	"amazon.co.jp",
	"amazon.de",
	"amazon.co.uk",
	"amazon.fr",
	"amazon.ca",
	"amazon.com.au",
	"amazon.es",
	"amazon.it",
	"amazon.nl",
	"amazon.com.mx",
	"amazon.com.br",
	"amazon.com.sg",
	"amazon.ae",
	"amazon.sa",
] as const;

// ── MDN ──────────────────────────────────────────────────────────────────────
const DOCS_MDN_HOSTS = [
	"developer.mozilla.org",
] as const;

// ── Docusaurus-based ─────────────────────────────────────────────────────────
const DOCS_DOCUSAURUS_HOSTS = [
	"docusaurus.io",
	"redux.js.org",
	"redux-toolkit.js.org",
	"trpc.io",
	"prisma.io",
	"typeorm.io",
	"jestjs.io",
	"reactnative.dev",
	"sequelize.org",
	"socket.io",
	"docs.sentry.io",
	"biomejs.dev",
	"authjs.dev",
	"tanstack.com",
	"pptr.dev",
	"testing-library.com",
	"docs.nestjs.com",
	"storybook.js.org",
	"reactrouter.com",
	"docs.expo.dev",
	"docs.expo.io",
	"docs.cypress.io",
] as const;

// ── VitePress-based ──────────────────────────────────────────────────────────
const DOCS_VITEPRESS_HOSTS = [
	"vuejs.org",
	"vueuse.org",
	"router.vuejs.org",
	"pinia.vuejs.org",
	"vite.dev",
	"vitejs.dev",
	"rollupjs.org",
	"vitepress.dev",
	"valibot.dev",
	"rspack.dev",
	"vitest.dev",
] as const;

// ── MkDocs Material ──────────────────────────────────────────────────────────
const DOCS_MKDOCS_HOSTS = [
	"kubernetes.io",
	"fastapi.tiangolo.com",
	"docs.pnpm.io",
	"pnpm.io",
	"helm.sh",
	"docs.docker.com",
	"developer.hashicorp.com",
	"grafana.com",
	"squidfunk.github.io",
] as const;

// ── Sphinx / ReadTheDocs ─────────────────────────────────────────────────────
const DOCS_SPHINX_HOSTS = [
	"docs.python.org",
	"flask.palletsprojects.com",
	"docs.djangoproject.com",
	"docs.pytest.org",
	"docs.sqlalchemy.org",
	"sqlalchemy.org",
	"docs.readthedocs.io",
	"docs.readthedocs.com",
	"docs.langchain.com",
	"python.langchain.com",
] as const;

// ── Google Devsite ───────────────────────────────────────────────────────────
const DOCS_DEVSITE_HOSTS = [
	"developers.google.com",
	"developer.chrome.com",
	"web.dev",
	"firebase.google.com",
	"developer.android.com",
	"cloud.google.com",
	"www.tensorflow.org",
] as const;

// ── Next.js docs ─────────────────────────────────────────────────────────────
const DOCS_NEXTJS_HOSTS = [
	"nextjs.org",
] as const;

// ── Generic docs (custom frameworks, Rustdoc, GitBook, etc.) ─────────────────
const DOCS_SITE_HOSTS = [
	"nodejs.org",
	"www.typescriptlang.org",
	"typescriptlang.org",
	"doc.rust-lang.org",
	"docs.rs",
	"go.dev",
	"pkg.go.dev",
	"kotlinlang.org",
	"www.php.net",
	"ruby-doc.org",
	"cppreference.com",
	"www.cppreference.com",
	"docs.swift.org",
	"elixir-lang.org",
	"docs.scala-lang.org",
	"dlang.org",
	"crystal-lang.org",
	"www.haskell.org",
	"www.erlang.org",
	"lua.org",
	"www.lua.org",
	"julialang.org",
	"docs.julialang.org",
	"react.dev",
	"angular.io",
	"angular.dev",
	"nuxt.com",
	"svelte.dev",
	"kit.svelte.dev",
	"remix.run",
	"astro.build",
	"nx.dev",
	"docs.deno.com",
	"payloadcms.com",
	"expressjs.com",
	"laravel.com",
	"inertiajs.com",
	"livewire.laravel.com",
	"symfony.com",
	"api.rubyonrails.org",
	"guides.rubyonrails.org",
	"rubyonrails.org",
	"rubydoc.info",
	"htmx.org",
	"hotwired.dev",
	"turbo.hotwired.dev",
	"stimulus.hotwired.dev",
	"alpinejs.dev",
	"solidjs.com",
	"preactjs.com",
	"qwik.dev",
	"react-hook-form.com",
	"mobx.js.org",
	"rxjs.dev",
	"lit.dev",
	"docs.aws.amazon.com",
	"learn.microsoft.com",
	"docs.microsoft.com",
	"docs.github.com",
	"docs.gitlab.com",
	"docs.netlify.com",
	"vercel.com",
	"developers.cloudflare.com",
	"render.com",
	"fly.io",
	"www.postgresql.org",
	"dev.mysql.com",
	"www.mongodb.com",
	"redis.io",
	"www.sqlite.org",
	"clickhouse.com",
	"www.elastic.co",
	"cassandra.apache.org",
	"docs.influxdata.com",
	"www.cockroachlabs.com",
	"supabase.com",
	"planetscale.com",
	"webpack.js.org",
	"esbuild.github.io",
	"babeljs.io",
	"playwright.dev",
	"eslint.org",
	"prettier.io",
	"yarnpkg.com",
	"bun.sh",
	"axios-http.com",
	"date-fns.org",
	"day.js.org",
	"lodash.com",
	"zustand.docs.pmnd.rs",
	"api.jquery.com",
	"threejs.org",
	"stripe.com",
	"platform.openai.com",
	"docs.anthropic.com",
	"www.twilio.com",
	"docs.sendgrid.com",
	"auth0.com",
	"clerk.com",
	"resend.com",
	"posthog.com",
	"tailwindcss.com",
	"getbootstrap.com",
	"mui.com",
	"ui.shadcn.com",
	"radix-ui.com",
	"chakra-ui.com",
	"flutter.dev",
	"docs.flutter.dev",
	"pytorch.org",
	"scikit-learn.org",
	"pandas.pydata.org",
	"numpy.org",
	"matplotlib.org",
	"huggingface.co",
	"graphql.org",
	"grpc.io",
	"www.apollographql.com",
	"zod.dev",
	"orm.drizzle.team",
	"www.w3schools.com",
	"www.w3.org",
	"man7.org",
	"devdocs.io",
	"docs.gitbook.com",
	"developer.apple.com",
	"developer.atlassian.com",
	"git-scm.com",
	"docs.oracle.com",
	"kafka.apache.org",
	"prometheus.io",
	"fastify.dev",
	"electronjs.org",
	"cookbook.openai.com",
	"nginx.org",
	"docs.snowflake.com",
	"developer.salesforce.com",
	"turbo.build",
	"mongoosejs.com",
	"sass-lang.com",
] as const;

const DOMAIN_PARSERS: Record<string, Parser> = {
	...mapDomains(["crunchbase.com"], parseCrunchbase),
	...mapDomains(["github.com", "gist.github.com"], parseGitHub),
	...mapDomains(["gitlab.com"], parseGitLab),
	...mapDomains(["stackoverflow.com"], parseStackOverflow),
	...mapDomains(WIKIPEDIA_HOSTS, parseWikipedia),
	...mapDomains(["reddit.com", "old.reddit.com"], parseReddit),
	...mapDomains(["news.ycombinator.com"], parseHackerNews),
	...mapDomains(NEWS_ARTICLE_HOSTS, parseNewsArticle),
	...mapDomains(["pubmed.ncbi.nlm.nih.gov"], parsePubMed),
	...mapDomains(["semanticscholar.org"], parseSemanticScholar),
	...mapDomains(["youtube.com", "music.youtube.com"], parseYouTube),
	...mapDomains(["vimeo.com"], parseVimeo),
	...mapDomains(AMAZON_HOSTS, parseAmazon),
	...mapDomains(["ebay.com"], parseEbay),
	...mapDomains(["walmart.com"], parseWalmart),
	...mapDomains(["target.com"], parseTarget),
	...mapDomains(["etsy.com"], parseEtsy),
	...mapDomains(["producthunt.com"], parseProductHunt),
	...mapDomains(["imdb.com"], parseImdb),
	...mapDomains(["rottentomatoes.com"], parseRottenTomatoes),
	...mapDomains(["metacritic.com"], parseMetacritic),
	...mapDomains(["fandom.com"], parseFandom),
	...mapDomains(["goodreads.com"], parseGoodreads),
	...mapDomains(["apps.apple.com"], parseAppStore),
	...mapDomains(["play.google.com"], parsePlayStore),
	...mapDomains(["open.spotify.com"], parseSpotify),
	...mapDomains(["quora.com"], parseQuora),
	...mapDomains(["x.com", "twitter.com"], parseTwitter),
	...mapDomains(["linkedin.com"], parseLinkedIn),
	...mapDomains(["facebook.com"], parseFacebook),
	...mapDomains(["instagram.com"], parseInstagram),
	...mapDomains(["tiktok.com"], parseTiktok),
	...mapDomains(["finance.yahoo.com"], parseYahooFinance),
	...mapDomains(["zillow.com"], parseZillow),
	...mapDomains(["yelp.com"], parseYelp),
	...mapDomains(["trustpilot.com"], parseTrustpilot),
	...mapDomains(["tripadvisor.com"], parseTripAdvisor),
	...mapDomains(["booking.com"], parseBooking),
	...mapDomains(["airbnb.com"], parseAirbnb),
	...mapDomains(["npmjs.com"], parseNpm),
	...mapDomains(["nuget.org"], parseNuget),
	...mapDomains(["pypi.org"], parsePypi),
	...mapDomains(["hub.docker.com"], parseDockerHub),
	...mapDomains(["pub.dev"], parsePubDev),
	...mapDomains(["cocoapods.org"], parseCocoaPods),
	...mapDomains(["jsr.io"], parseJsr),
	...mapDomains(["arxiv.org"], parseArxiv),
	...mapDomains(["crates.io"], parseCrates),
	...mapDomains(["rubygems.org"], parseRubyGems),
	...mapDomains(["packagist.org"], parsePackagist),
	...mapDomains(["hackage.haskell.org"], parseHackage),
	...mapDomains(["hex.pm"], parseHex),
	...mapDomains(["metacpan.org"], parseMetacpan),
	...mapDomains(["central.sonatype.com"], parseMavenCentral),
	...mapDomains(["swiftpackageindex.com"], parseSwiftPackageIndex),
	...mapDomains(["wellfound.com"], parseWellfound),
	...mapDomains(["indeed.com"], parseIndeed),
	...mapDomains(["glassdoor.com"], parseGlassdoor),
	...mapDomains(["google.com"], parseGoogle),
	...mapDomains(["bing.com"], parseBing),
	...mapDomains(["duckduckgo.com"], parseDuckDuckGo),
	...mapDomains(["search.brave.com"], parseBraveSearch),
	...mapDomains(DOCS_MDN_HOSTS, parseDocsMdn),
	...mapDomains(DOCS_DOCUSAURUS_HOSTS, parseDocsDocusaurus),
	...mapDomains(DOCS_VITEPRESS_HOSTS, parseDocsVitepress),
	...mapDomains(DOCS_MKDOCS_HOSTS, parseDocsMkdocs),
	...mapDomains(DOCS_SPHINX_HOSTS, parseDocsSphinx),
	...mapDomains(DOCS_DEVSITE_HOSTS, parseDocsDevsite),
	...mapDomains(DOCS_NEXTJS_HOSTS, parseDocsNextjs),
	...mapDomains(DOCS_SITE_HOSTS, parseDocsSite),
};

export function resolveParser(url: string, parserHint?: string): Parser | null {
	// 1. Explicit hint from rule config
	if (parserHint === "generic") {
		return null;
	}
	const inherited = resolveInheritedParserHint(parserHint);
	if (inherited) {
		return inherited;
	}
	if (parserHint && parserHint !== "docs-site") {
		const hinted = PARSER_REGISTRY[parserHint];
		if (hinted) return hinted;
	}

	// For "docs-site" hint, prefer a more specific domain parser if available
	// (e.g. docs-docusaurus, docs-vitepress, etc.)

	const hostname = new URL(url).hostname.replace(/^www\./, "");

	// 2. Suffix match for fandom subdomains
	if (hostname.endsWith(".fandom.com") || hostname === "fandom.com") {
		return parseFandom;
	}

	// 3. Suffix match for Wikipedia language editions
	const isWikiSite =
		hostname.endsWith(".wikipedia.org") ||
		hostname.endsWith(".wikibooks.org") ||
		hostname.endsWith(".wikisource.org") ||
		hostname.endsWith(".wikiversity.org");
	if (isWikiSite) {
		return parseWikipedia;
	}

	// 4. Hosted docs platforms that share common HTML structures.
	if (hostname.endsWith(".readthedocs.io") || hostname.endsWith(".readthedocs.com")) {
		return parseDocsSphinx;
	}
	if (hostname.endsWith(".gitbook.io")) {
		return parseDocsSite;
	}

	// 5. Domain-level default (exclude parseGeneric — that's the null case)
	const domainParser = DOMAIN_PARSERS[hostname];
	if (domainParser && domainParser !== parseGeneric) {
		return domainParser;
	}

	// 6. No specific parser — caller should use parseGeneric
	return null;
}
