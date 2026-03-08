import { headersToObject } from "./utils";
import type { FetchAttemptInput, UpstreamPayload } from "./types";

const DEFAULT_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_REDIRECTS = 10;
const DEFAULT_MAX_RESPONSE_BYTES = 5_000_000;

function resolveMaxResponseBytes(): number {
	const raw = Number(process.env.MAX_RESPONSE_BYTES ?? DEFAULT_MAX_RESPONSE_BYTES);
	return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_RESPONSE_BYTES;
}

function isRedirectStatus(statusCode: number): boolean {
	return statusCode >= 300 && statusCode < 400;
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
	if (!response.body) {
		return "";
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let output = "";
	let totalBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;

			totalBytes += value.byteLength;
			if (totalBytes > maxBytes) {
				await reader.cancel().catch(() => {});
				throw new Error("Response too large");
			}

			output += decoder.decode(value, { stream: true });
		}

		output += decoder.decode();
		return output;
	} finally {
		reader.releaseLock();
	}
}

export async function runFetchAttempt(input: FetchAttemptInput): Promise<UpstreamPayload> {
	const maxResponseBytes = input.maxResponseBytes ?? resolveMaxResponseBytes();

	const requestInit: RequestInit = {
		method: "GET",
		redirect: "manual",
		headers: {
			"user-agent": process.env.UNLOCKER_USER_AGENT ?? DEFAULT_USER_AGENT,
			accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"accept-language": "en-US,en;q=0.8",
			...(input.headers ?? {}),
		},
		signal: AbortSignal.timeout(input.timeoutMs),
	};

	let currentUrl = input.url;

	for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
		const response = await fetch(currentUrl, requestInit);

		if (isRedirectStatus(response.status)) {
			if (redirectCount >= MAX_REDIRECTS) {
				throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
			}

			const location = response.headers.get("location");
			if (!location) {
				throw new Error("Redirect without Location header");
			}

			currentUrl = new URL(location, currentUrl).toString();
			continue;
		}

		const body = await readBodyWithLimit(response, maxResponseBytes);

		return {
			statusCode: response.status,
			headers: headersToObject(response.headers),
			body,
			finalUrl: response.url || currentUrl,
		};
	}

	throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
}
