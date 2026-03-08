import { isTimeoutError, normalizeErrorMessage } from "./utils";
import type {
	AttemptTrace,
	Classification,
	ClassificationOutcome,
	ResolvedPolicy,
	Strategy,
	UnlockResult,
	UpstreamPayload,
} from "./types";
import { runFetchAttempt } from "./fetch-client";
import { runBrowserAttempt } from "./browser-client";

// --- Classifier ---

const BLOCKED_BODY_PATTERNS = [
	/just a moment/i,
	/cloudflare/i,
	/verify you are human/i,
	/access denied/i,
	/bot detection/i,
	/attention required/i,
	/cdn-cgi\/challenge-platform/i,
	/cf-challenge/i,
	/captcha-delivery\.com/i,
	/g-recaptcha/i,
	/hcaptcha\.com/i,
	/checking your browser before (you )?access/i,
	/checking if the site connection is secure/i,
	/your browser will redirect to your requested content shortly/i,
	/pardon our interruption/i,
	/please stand by, while we are checking your browser/i,
	/automated process.*click this link/i,
	/please confirm that you.re a human/i,
	/confirm you.re not a robot/i,
	/needs to review the security of your connection/i,
	/opfcaptcha\.amazon\.com/i,
	/automated access to amazon data/i,
	/click the button below to continue shopping/i,
	/we must verify your session before you can proceed/i,
	/verification successful\.\s*waiting for/i,
	/help us protect glassdoor/i,
	/verify that you(?:'|’)re a real person/i,
	/confirming that you are a real person/i,
];

const JS_REQUIRED_BODY_PATTERNS = [
	/enable javascript/i,
	/javascript is disabled/i,
	/requires javascript/i,
	/please turn javascript on/i,
	/you need to enable javascript/i,
];

const BLOCKED_TITLE_PATTERNS = [
	/just a moment/i,
	/one moment, please/i,
	/security check/i,
	/verify you are human/i,
	/help us protect glassdoor/i,
	/we must verify your session before you can proceed/i,
];

function extractHtmlTitle(html: string): string {
	const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
	return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function stripHtmlToVisibleText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<svg[\s\S]*?<\/svg>/gi, " ")
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, "\"")
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function looksLikeRealBrowserContent(response: UpstreamPayload): boolean {
	if (response.statusCode >= 400) return false;

	const probe = response.body.slice(0, 120_000);
	const title = extractHtmlTitle(probe);
	if (BLOCKED_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
		return false;
	}

	const visibleText = stripHtmlToVisibleText(probe);
	if (visibleText.length < 500) {
		return false;
	}

	return /<article\b|<main\b|<h1\b|application\/ld\+json|property=["']og:title["']|data-test=|grid-row\b|__NEXT_DATA__/i.test(
		probe,
	);
}

function classifyAttempt(input: {
	response?: UpstreamPayload;
	error?: unknown;
	isBrowserStrategy?: boolean;
}): Classification {
	if (!input.response) {
		if (isTimeoutError(input.error)) {
			return {
				outcome: "upstream_error",
				classifier: "timeout",
				isBlocked: false,
				isJsRequired: false,
				isTerminal: false,
			};
		}

		return {
			outcome: "upstream_error",
			classifier: "network_error",
			isBlocked: false,
			isJsRequired: false,
			isTerminal: false,
		};
	}

	const { statusCode, body } = input.response;
	const snippet = body.slice(0, 20_000);
	const trimmed = body.trimStart();
	const looksLikeJsonPayload =
		(trimmed.startsWith("{") || trimmed.startsWith("[")) &&
		!/<html[\s>]|<!doctype html/i.test(trimmed);
	const looksLikePlaintextJsonWrapper =
		/<pre>\s*[\[{]/i.test(snippet) && /plaintext\.css/i.test(snippet);

	const hasBlockedMarker =
		statusCode === 401 ||
		statusCode === 403 ||
		BLOCKED_BODY_PATTERNS.some((pattern) => pattern.test(snippet));

	const snippetForJsCheck = input.isBrowserStrategy
		? snippet.replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
		: snippet;
	const hasJsMarker = JS_REQUIRED_BODY_PATTERNS.some((pattern) =>
		pattern.test(snippetForJsCheck),
	);

	if (statusCode === 404 || statusCode === 410) {
		return {
			outcome: "not_found",
			classifier: "http_not_found",
			isBlocked: false,
			isJsRequired: false,
			isTerminal: true,
		};
	}

	if (statusCode === 429) {
		return {
			outcome: "rate_limited",
			classifier: "http_429",
			isBlocked: true,
			isJsRequired: hasJsMarker,
			isTerminal: false,
		};
	}

	if (input.isBrowserStrategy && looksLikeRealBrowserContent(input.response)) {
		return {
			outcome: "success",
			classifier: hasBlockedMarker ? "ok_with_residual_challenge_scripts" : "ok",
			isBlocked: false,
			isJsRequired: false,
			isTerminal: false,
		};
	}

	if (hasBlockedMarker && hasJsMarker) {
		return {
			outcome: "blocked",
			classifier: "blocked_and_js_required",
			isBlocked: true,
			isJsRequired: true,
			isTerminal: false,
		};
	}

	if (hasBlockedMarker) {
		return {
			outcome: "blocked",
			classifier: "blocked",
			isBlocked: true,
			isJsRequired: false,
			isTerminal: false,
		};
	}

	if (hasJsMarker) {
		return {
			outcome: "js_required",
			classifier: "js_required",
			isBlocked: false,
			isJsRequired: true,
			isTerminal: false,
		};
	}

	if (!input.isBrowserStrategy && looksLikeJsonPayload) {
		return {
			outcome: "js_required",
			classifier: "fetch_returned_json_payload",
			isBlocked: false,
			isJsRequired: true,
			isTerminal: false,
		};
	}

	if (looksLikePlaintextJsonWrapper) {
		return {
			outcome: "upstream_error",
			classifier: "plaintext_json_wrapper",
			isBlocked: false,
			isJsRequired: false,
			isTerminal: false,
		};
	}

	if (statusCode >= 500) {
		return {
			outcome: "upstream_error",
			classifier: "http_5xx",
			isBlocked: false,
			isJsRequired: false,
			isTerminal: false,
		};
	}

	if (statusCode >= 400) {
		return {
			outcome: "bad_request",
			classifier: "http_4xx_terminal",
			isBlocked: false,
			isJsRequired: false,
			isTerminal: true,
		};
	}

	return {
		outcome: "success",
		classifier: "ok",
		isBlocked: false,
		isJsRequired: false,
		isTerminal: false,
	};
}

// --- Orchestrator ---

function recommendedNextStrategy(
	current: Strategy,
	classification: Classification,
): Strategy | null {
	if (current === "fetch") {
		if (classification.isJsRequired || classification.isBlocked) {
			return "browser";
		}
		if (
			classification.outcome === "rate_limited" ||
			classification.outcome === "upstream_error"
		) {
			return "browser";
		}
		return null;
	}
	// browser is terminal
	return null;
}

function shouldRetryBrowserAttempt(classification: Classification): boolean {
	return (
		classification.outcome === "blocked" ||
		classification.outcome === "upstream_error" ||
		classification.outcome === "rate_limited"
	);
}

function stepTimeoutMs(strategy: Strategy, policy: ResolvedPolicy): number {
	return strategy === "fetch" ? policy.fetchTimeoutMs : policy.browserTimeoutMs;
}

async function executeAttempt(
	strategy: Strategy,
	url: string,
	timeoutMs: number,
	headers: Record<string, string>,
	policy: ResolvedPolicy,
): Promise<{
	response?: UpstreamPayload;
	error?: unknown;
}> {
	const effectiveHeaders = Object.keys(headers).length > 0 ? headers : undefined;

	if (strategy === "fetch") {
		try {
			const response = await runFetchAttempt({
				url,
				timeoutMs,
				headers: effectiveHeaders,
				maxResponseBytes: policy.maxResponseBytes,
			});
			return { response };
		} catch (error) {
			return { error };
		}
	}

	try {
		const response = await runBrowserAttempt({
			url,
			timeoutMs,
			headers: effectiveHeaders,
			actions: policy.browserActions,
			maxResponseBytes: policy.maxResponseBytes,
			includeShadowDom: policy.includeShadowDom,
		});
		return { response };
	} catch (error) {
		return { error };
	}
}

export interface UnlockOptions {
	url: string;
	policy: ResolvedPolicy;
	totalTimeoutMs?: number;
}

export async function unlock(options: UnlockOptions): Promise<UnlockResult> {
	const attempts: AttemptTrace[] = [];
	const attemptedStrategies = new Set<Strategy>();
	let browserRetryCount = 0;

	let current: Strategy | null = options.policy.entryStrategy;
	let lastResponse: UpstreamPayload | undefined;
	let lastClassification: Classification | undefined;
	let lastStrategyUsed: Strategy | undefined;
	let didHitTotalTimeout = false;

	const startedAt = Date.now();
	const totalTimeoutMs =
		options.totalTimeoutMs && options.totalTimeoutMs > 0 ? options.totalTimeoutMs : undefined;

	while (current) {
		const elapsedMs = Date.now() - startedAt;
		if (totalTimeoutMs && elapsedMs >= totalTimeoutMs) {
			didHitTotalTimeout = true;
			break;
		}

		const browserRetryLimit = options.policy.browserRetries;
		if (attemptedStrategies.has(current)) {
			if (current !== "browser" || browserRetryCount >= browserRetryLimit) {
				break;
			}
			browserRetryCount += 1;
		} else {
			attemptedStrategies.add(current);
		}
		const attemptStartedAt = Date.now();
		const remainingMs = totalTimeoutMs
			? Math.max(totalTimeoutMs - (attemptStartedAt - startedAt), 0)
			: undefined;
		const stepTimeout = stepTimeoutMs(current, options.policy);
		const effectiveStepTimeout =
			remainingMs != null ? Math.max(1, Math.min(stepTimeout, remainingMs)) : stepTimeout;

		if (remainingMs === 0) {
			didHitTotalTimeout = true;
			break;
		}

			const execution = await executeAttempt(
				current,
				options.url,
				effectiveStepTimeout,
				options.policy.headers,
				options.policy,
			);

		const classification = classifyAttempt({
			response: execution.response,
			error: execution.error,
			isBrowserStrategy: current === "browser",
		});

		attempts.push({
			strategy: current,
			outcome: classification.outcome,
			classifier: classification.classifier,
			latency_ms: Date.now() - attemptStartedAt,
			http_status: execution.response?.statusCode,
			error: execution.error ? normalizeErrorMessage(execution.error) : undefined,
		});

		if (execution.response) {
			lastResponse = execution.response;
			lastStrategyUsed = current;
		}

		lastClassification = classification;

		if (classification.outcome === "success" && execution.response) {
			return {
				statusCode: execution.response.statusCode,
				headers: execution.response.headers,
				body: execution.response.body,
				finalUrl: execution.response.finalUrl,
				strategyUsed: current,
				attempts,
				timing: {
					totalMs: Date.now() - startedAt,
				},
			};
		}

		if (
			current === "browser" &&
			shouldRetryBrowserAttempt(classification) &&
			browserRetryCount < browserRetryLimit
		) {
			continue;
		}

		if (classification.isTerminal) {
			break;
		}

		// Simple fallback: fetch → browser
		const next = recommendedNextStrategy(current, classification);
		if (next && options.policy.allowedStrategies.includes(next) && !attemptedStrategies.has(next)) {
			current = next;
		} else {
			current = null;
		}
	}

	const totalMs = Date.now() - startedAt;

	if (lastResponse) {
		return {
			statusCode: lastResponse.statusCode,
			headers: lastResponse.headers,
			body: lastResponse.body,
			finalUrl: lastResponse.finalUrl,
			strategyUsed: lastStrategyUsed,
			attempts,
			error: {
				type: lastClassification?.outcome ?? "upstream_error",
				message: didHitTotalTimeout
					? "Total timeout reached before completion"
					: "All allowed strategies were exhausted",
			},
			timing: { totalMs },
		};
	}

	return {
		statusCode: 502,
		headers: {},
		body: "",
		attempts,
		error: {
			type: lastClassification?.outcome ?? "upstream_error",
			message: didHitTotalTimeout
				? "Total timeout reached before completion"
				: "No upstream response was received",
		},
		timing: { totalMs },
	};
}
