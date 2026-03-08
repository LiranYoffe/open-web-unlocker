#!/usr/bin/env bun
/**
 * Test a parser against saved HTML fixtures.
 *
 * Usage: bun run scripts/test-parser.ts <name> [--markdown]
 *
 * Reads scripts/fixtures/<name>.html and runs the matching parser,
 * printing the full JSON output (or markdown with --markdown flag).
 */

import { readFileSync } from "node:fs";
import { loadRulesConfig, resolvePolicyForUrl } from "../src/config";
import { resolveParser, parseGeneric } from "../src/parsers/index";
import { toMarkdown } from "../src/parsers/to-markdown";
import { fixturePath, readFixtureMeta } from "./fixture-meta";

const args = process.argv.slice(2);
const showMarkdown = args.includes("--markdown");
const name = args.find((a) => !a.startsWith("--"));

if (!name) {
	console.error("Usage: bun run scripts/test-parser.ts <name> [--markdown]");
	process.exit(1);
}

const htmlPath = fixturePath(name, "html");

let html: string;
try {
	html = readFileSync(htmlPath, "utf-8");
} catch {
	console.error(`Fixture not found: ${htmlPath}`);
	console.error(`Run 'bun run scripts/capture-fixtures.ts ${name} <url>' first.`);
	process.exit(1);
}

const meta = readFixtureMeta(name);
const url = meta?.finalUrl ?? meta?.url ?? `https://example.com/${name}`;
const rulesConfig = meta ? await loadRulesConfig() : null;
const resolvedPolicy =
	rulesConfig && meta ? resolvePolicyForUrl(new URL(url), rulesConfig) : null;
const parserHint =
	(resolvedPolicy?.parser && resolvedPolicy.parser !== "generic"
		? resolvedPolicy.parser
		: null) ??
	(meta?.policy.parser && meta.policy.parser !== "generic" ? meta.policy.parser : null) ??
	resolvedPolicy?.parser ??
	meta?.policy.parser;

console.log(`[test] Fixture: ${htmlPath} (${html.length} chars)`);
console.log(`[test] URL: ${url}`);
if (meta) {
	const displayDomain = resolvedPolicy?.canonicalDomain ?? meta.policy.domain;
	const displayRule = resolvedPolicy?.matchedRuleId ?? meta.policy.ruleId ?? "none";
	const displayParser = parserHint ?? resolvedPolicy?.parser ?? meta.policy.parser ?? "none";
	const displayEntry = resolvedPolicy?.entryStrategy ?? meta.policy.entryStrategy;
	console.log(
		`[test] Policy: domain=${displayDomain} rule=${displayRule} parser=${displayParser} entry=${displayEntry} strategy=${meta.strategyUsed ?? "none"}`,
	);
}

const parser = resolveParser(url, parserHint);

if (parser) {
	console.log(`[test] Using domain-specific parser\n`);
	try {
		const pageData = parser(html, url);
		if (showMarkdown) {
			console.log(toMarkdown(pageData));
		} else {
			console.log(JSON.stringify(pageData, null, 2));
		}
	} catch (error) {
		console.error("[test] Parser error:", error);
		process.exit(1);
	}
} else {
	console.log(`[test] No specific parser found, using generic\n`);
	const genericData = parseGeneric(html, url);
	if (showMarkdown) {
		console.log(toMarkdown(genericData));
	} else {
		console.log(JSON.stringify(genericData, null, 2));
	}
}
