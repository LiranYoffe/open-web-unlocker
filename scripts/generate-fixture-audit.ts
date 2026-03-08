#!/usr/bin/env bun

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadRulesConfig, resolvePolicyForUrl } from "../src/config";
import { parseGeneric, resolveParser } from "../src/parsers/index";
import type { PageData } from "../src/parsers/page-data";
import { fixturePath, fixturesDir, readFixtureMeta } from "./fixture-meta";

interface AuditCase {
	fixture: string;
	url: string;
	parser: string;
	type: string;
	result: PageData;
}

interface AuditFailure {
	fixture: string;
	url: string;
	parser: string;
	category: "parser_error" | "blocked" | "not_found" | "unsupported";
	error: string;
}

interface FieldStat {
	parser: string;
	path: string;
	samples: number;
	nonEmpty: number;
}

function isEmptyValue(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === "string" && value.trim() === "") return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
}

function walkFields(
	value: unknown,
	prefix = "",
	out: Array<{ path: string; empty: boolean }> = [],
): Array<{ path: string; empty: boolean }> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return out;
	}

	for (const [key, child] of Object.entries(value)) {
		const path = prefix ? `${prefix}.${key}` : key;
		out.push({ path, empty: isEmptyValue(child) });
		if (child && typeof child === "object" && !Array.isArray(child)) {
			walkFields(child, path, out);
		}
	}

	return out;
}

const outputArg = process.argv[2];
const outputPath = outputArg
	? resolve(process.cwd(), outputArg)
	: resolve(process.cwd(), "reports", "fixture-parser-audit.json");

const fixtureNames = [...new Set(
	readdirSync(fixturesDir())
		.filter((name) => name.endsWith(".meta.json"))
		.map((name) => name.replace(/\.meta\.json$/, "")),
)].sort();

const config = await loadRulesConfig();
const successes: AuditCase[] = [];
const failures: AuditFailure[] = [];
const fieldStats = new Map<string, FieldStat>();

function classifyFixtureFailure(input: {
	statusCode: number;
	unsupportedReason?: string;
	error: string;
	html: string;
}): AuditFailure["category"] {
	if (input.unsupportedReason) return "unsupported";
	if (input.statusCode === 404 || input.statusCode === 410) return "not_found";
	if (
		/login-gated|verify your session|continue shopping|verification successful|challenge/i.test(
			`${input.error}\n${input.html.slice(0, 8000)}`,
		)
	) {
		return "blocked";
	}
	return "parser_error";
}

for (const fixture of fixtureNames) {
	const meta = readFixtureMeta(fixture);
	if (!meta) continue;

	const html = readFileSync(fixturePath(fixture, "html"), "utf-8");
	const url = meta.finalUrl ?? meta.url;
	const resolvedPolicy = resolvePolicyForUrl(new URL(url), config);
	const parserHint =
		(resolvedPolicy.parser && resolvedPolicy.parser !== "generic"
			? resolvedPolicy.parser
			: null) ??
		(meta.policy.parser && meta.policy.parser !== "generic" ? meta.policy.parser : null) ??
		resolvedPolicy.parser ??
		meta.policy.parser ??
		"generic";
	const parser = resolveParser(url, parserHint);

	try {
		const result = (parser ? parser(html, url) : parseGeneric(html, url)) as PageData;
		successes.push({
			fixture,
			url,
			parser: parserHint,
			type: result.type,
			result,
		});

		for (const field of walkFields(result)) {
			const key = `${parserHint}:${field.path}`;
			const stat = fieldStats.get(key) ?? {
				parser: parserHint,
				path: field.path,
				samples: 0,
				nonEmpty: 0,
			};
			stat.samples += 1;
			if (!field.empty) stat.nonEmpty += 1;
			fieldStats.set(key, stat);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		failures.push({
			fixture,
			url,
			parser: parserHint,
			category: classifyFixtureFailure({
				statusCode: meta.statusCode,
				unsupportedReason: resolvedPolicy.unsupportedReason,
				error: errorMessage,
				html,
			}),
			error: errorMessage,
		});
	}
}

const failureSummary = {
	parserErrors: failures.filter((item) => item.category === "parser_error").length,
	blocked: failures.filter((item) => item.category === "blocked").length,
	notFound: failures.filter((item) => item.category === "not_found").length,
	unsupported: failures.filter((item) => item.category === "unsupported").length,
};

const audit = {
	generatedAt: new Date().toISOString(),
	output: "Successful saved-fixture parser audit with full parsed JSON for each passing case.",
	summary: {
		totalFixtures: fixtureNames.length,
		successfulFixtures: successes.length,
		failedFixtures: failures.length,
		...failureSummary,
	},
	observedAlwaysEmptyFields: [...fieldStats.values()]
		.filter((stat) => stat.samples > 0 && stat.nonEmpty === 0)
		.sort((a, b) => a.parser.localeCompare(b.parser) || a.path.localeCompare(b.path)),
	failures,
	cases: successes,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`);

console.log(`Wrote ${successes.length} passing cases to ${outputPath}`);
if (failures.length > 0) {
	console.log(`Recorded ${failures.length} fixture failures in the same file`);
}
