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
import { parseDocsSite } from "./docs-site";
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

const DOCS_HOSTED_SUFFIXES = [".readthedocs.io", ".gitbook.io"] as const;

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

const DOCS_SITE_HOSTS = [
	"developer.mozilla.org",
	"docs.python.org",
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
	"vuejs.org",
	"angular.io",
	"angular.dev",
	"nextjs.org",
	"nuxt.com",
	"svelte.dev",
	"kit.svelte.dev",
	"remix.run",
	"astro.build",
	"nx.dev",
	"docs.deno.com",
	"payloadcms.com",
	"vite.dev",
	"expressjs.com",
	"fastapi.tiangolo.com",
	"flask.palletsprojects.com",
	"docs.djangoproject.com",
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
	"vueuse.org",
	"react-hook-form.com",
	"mobx.js.org",
	"rxjs.dev",
	"lit.dev",
	"docs.aws.amazon.com",
	"cloud.google.com",
	"learn.microsoft.com",
	"docs.microsoft.com",
	"docs.docker.com",
	"kubernetes.io",
	"developer.hashicorp.com",
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
	"sqlalchemy.org",
	"docs.sqlalchemy.org",
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
	"rollupjs.org",
	"rspack.dev",
	"vitejs.dev",
	"esbuild.github.io",
	"babeljs.io",
	"jestjs.io",
	"vitest.dev",
	"docs.pytest.org",
	"docs.cypress.io",
	"playwright.dev",
	"pptr.dev",
	"testing-library.com",
	"eslint.org",
	"prettier.io",
	"biomejs.dev",
	"docs.pnpm.io",
	"yarnpkg.com",
	"bun.sh",
	"authjs.dev",
	"axios-http.com",
	"date-fns.org",
	"day.js.org",
	"lodash.com",
	"redux-toolkit.js.org",
	"zustand.docs.pmnd.rs",
	"pinia.vuejs.org",
	"router.vuejs.org",
	"valibot.dev",
	"api.jquery.com",
	"threejs.org",
	"stripe.com",
	"developers.google.com",
	"platform.openai.com",
	"docs.anthropic.com",
	"www.twilio.com",
	"docs.sendgrid.com",
	"auth0.com",
	"clerk.com",
	"resend.com",
	"docs.sentry.io",
	"posthog.com",
	"tailwindcss.com",
	"getbootstrap.com",
	"mui.com",
	"ui.shadcn.com",
	"radix-ui.com",
	"chakra-ui.com",
	"docs.expo.dev",
	"reactnative.dev",
	"flutter.dev",
	"docs.flutter.dev",
	"www.tensorflow.org",
	"pytorch.org",
	"scikit-learn.org",
	"pandas.pydata.org",
	"numpy.org",
	"matplotlib.org",
	"huggingface.co",
	"graphql.org",
	"grpc.io",
	"www.apollographql.com",
	"redux.js.org",
	"tanstack.com",
	"prisma.io",
	"typeorm.io",
	"zod.dev",
	"trpc.io",
	"orm.drizzle.team",
	"www.w3schools.com",
	"www.w3.org",
	"developer.android.com",
	"man7.org",
	"docs.expo.io",
	"devdocs.io",
	"docs.readthedocs.io",
	"docs.readthedocs.com",
	"docs.gitbook.com",
	"developer.apple.com",
	"developer.chrome.com",
	"web.dev",
	"firebase.google.com",
	"developer.atlassian.com",
	"git-scm.com",
	"docs.oracle.com",
	"kafka.apache.org",
	"helm.sh",
	"grafana.com",
	"prometheus.io",
	"docs.nestjs.com",
	"fastify.dev",
	"socket.io",
	"electronjs.org",
	"cookbook.openai.com",
	"docs.langchain.com",
	"python.langchain.com",
	"nginx.org",
	"docs.snowflake.com",
	"developer.salesforce.com",
	"storybook.js.org",
	"vitepress.dev",
	"docusaurus.io",
	"turbo.build",
	"mongoosejs.com",
	"sequelize.org",
	"reactrouter.com",
	"pnpm.io",
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
	...mapDomains(DOCS_SITE_HOSTS, parseDocsSite),
};

export function resolveParser(url: string, parserHint?: string): Parser | null {
	// 1. Explicit hint from rule config
	if (parserHint === "generic") {
		return null;
	}
	if (parserHint) {
		const hinted = PARSER_REGISTRY[parserHint];
		if (hinted) return hinted;
	}

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
	if (DOCS_HOSTED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
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
