#!/usr/bin/env bun
/**
 * Capture HTML fixtures for parser development.
 *
 * Usage: bun run scripts/capture-fixtures.ts <name> <url>
 *
 * Saves four files to scripts/fixtures/:
 *   <name>.html        — raw HTML
 *   <name>.generic.md  — generic markdown conversion
 *   <name>.jsonld.txt  — extracted JSON-LD blocks
 *   <name>.scripts.txt — other inline data scripts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { extractMarkdown } from "../src/html-to-markdown";
import { loadRulesConfig, resolvePolicyForUrl } from "../src/config";
import { unlock } from "../src/unlock";
import { fixturePath, fixturesDir } from "./fixture-meta";

const [name, url] = process.argv.slice(2);

if (!name || !url) {
	console.error("Usage: bun run scripts/capture-fixtures.ts <name> <url>");
	process.exit(1);
}

mkdirSync(fixturesDir(), { recursive: true });

console.log(`[capture] Fetching ${url} ...`);

const targetUrl = new URL(url);
const rulesConfig = await loadRulesConfig();
const policy = resolvePolicyForUrl(targetUrl, rulesConfig);

if (policy.unsupportedReason) {
	console.error(`[capture] Unsupported route: ${policy.unsupportedReason}`);
	process.exit(2);
}

function fixtureCaptureTimeoutMs(): number {
	const fetchBudget = policy.allowedStrategies.includes("fetch") ? policy.fetchTimeoutMs : 0;
	const browserAttempts = policy.allowedStrategies.includes("browser")
		? policy.browserRetries + 1
		: 0;
	const browserBudget = browserAttempts * policy.browserTimeoutMs;
	return Math.min(120_000, Math.max(60_000, fetchBudget + browserBudget + 10_000));
}

const result = await unlock({
	url: targetUrl.toString(),
	policy,
	totalTimeoutMs: fixtureCaptureTimeoutMs(),
});

if (!result.body) {
	console.error("[capture] No body received");
	process.exit(1);
}

const html = result.body;
console.log(`[capture] Got ${html.length} chars (strategy: ${result.strategyUsed ?? "none"})`);

// 1. Save raw HTML
writeFileSync(fixturePath(name, "html"), html);

// 1.5 Save metadata for deterministic re-testing
writeFileSync(
	fixturePath(name, "meta.json"),
	JSON.stringify(
		{
			name,
			url: targetUrl.toString(),
			finalUrl: result.finalUrl ?? targetUrl.toString(),
			strategyUsed: result.strategyUsed ?? null,
			statusCode: result.statusCode,
			policy: {
				domain: policy.canonicalDomain,
				ruleId: policy.matchedRuleId ?? null,
				parser: policy.parser ?? null,
				entryStrategy: policy.entryStrategy,
				allowedStrategies: policy.allowedStrategies,
			},
		},
		null,
		2,
	),
);

// 2. Save generic markdown
try {
	const { markdown } = extractMarkdown(html, url);
	writeFileSync(fixturePath(name, "generic.md"), markdown);
} catch (e) {
	console.error("[capture] Markdown extraction failed:", e);
	writeFileSync(fixturePath(name, "generic.md"), "");
}

// 3. Extract JSON-LD blocks
const jsonldBlocks: string[] = [];
const jsonldRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
let match: RegExpExecArray | null;
while ((match = jsonldRegex.exec(html)) !== null) {
	try {
		const parsed = JSON.parse(match[1]);
		jsonldBlocks.push(JSON.stringify(parsed, null, 2));
	} catch {
		jsonldBlocks.push(match[1].trim());
	}
}
writeFileSync(
	fixturePath(name, "jsonld.txt"),
	jsonldBlocks.length > 0
		? jsonldBlocks.join("\n\n---\n\n")
		: "(no JSON-LD blocks found)",
);

// 4. Extract inline data scripts
const dataScripts: string[] = [];
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
while ((match = scriptRegex.exec(html)) !== null) {
	const content = match[1].trim();
	if (!content) continue;
	// Skip JSON-LD (already captured) and external scripts
	if (match[0].includes("application/ld+json")) continue;
	if (match[0].includes("src=")) continue;

	// Look for known data patterns
	const patterns = [
		/ytInitialPlayerResponse/,
		/ytInitialData/,
		/__NEXT_DATA__/,
		/window\.__data/,
		/window\.__PRELOADED_STATE__/,
		/window\._sharedData/,
		/window\.REDUX_DATA/,
	];

	if (patterns.some((p) => p.test(content))) {
		const preview = content.slice(0, 5000);
		dataScripts.push(preview + (content.length > 5000 ? "\n... (truncated)" : ""));
	}
}
writeFileSync(
	fixturePath(name, "scripts.txt"),
	dataScripts.length > 0
		? dataScripts.join("\n\n---\n\n")
		: "(no inline data scripts found)",
);

console.log(`[capture] Saved fixtures to scripts/fixtures/${name}.*`);
console.log(`  ${name}.html        — ${html.length} chars`);
console.log(`  ${name}.meta.json   — source URL + rule metadata`);
console.log(`  ${name}.generic.md  — generic markdown`);
console.log(`  ${name}.jsonld.txt  — ${jsonldBlocks.length} JSON-LD block(s)`);
console.log(`  ${name}.scripts.txt — ${dataScripts.length} data script(s)`);
