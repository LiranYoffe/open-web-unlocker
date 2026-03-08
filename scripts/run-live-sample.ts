#!/usr/bin/env bun

import { createHttpApp } from "../src/modes/http";

const [url, formatArg, timeoutArg] = process.argv.slice(2);
const format = formatArg === "html" || formatArg === "markdown" || formatArg === "json"
	? formatArg
	: "json";
const timeoutMs = Number(timeoutArg);

if (!url) {
	console.error("Usage: bun run scripts/run-live-sample.ts <url> [format] [timeout_ms]");
	process.exit(1);
}

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
	console.error("timeout_ms must be a positive number");
	process.exit(1);
}

const app = createHttpApp();
const request = new Request("http://localhost/fetch", {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({
		url,
		format,
		timeout_ms: timeoutMs,
	}),
});

const response = await app.fetch(request);
let payload: unknown;

try {
	payload = await response.json();
} catch {
	payload = { error: { type: "invalid_json", message: "Route returned a non-JSON payload" } };
}

process.stdout.write(
	JSON.stringify({
		status: response.status,
		payload,
	}),
);
