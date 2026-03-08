import { Hono } from "hono";
import { z } from "zod";
import { loadRulesConfig, resolvePolicyForUrl } from "../config";
import { unlock } from "../unlock";
import { parseGeneric, resolveParser } from "../parsers";
import { toMarkdown } from "../parsers/to-markdown";
import type { PageData } from "../parsers/page-data";
import type { ResolvedPolicy, UnlockResult } from "../types";

const fetchRequestSchema = z.object({
	url: z.string().url(),
	timeout_ms: z.number().int().positive().max(60_000).optional(),
	format: z.enum(["html", "markdown", "json"]).default("markdown"),
});

function clampTotalTimeout(timeoutMs?: number): number {
	const rawDefault = Number(process.env.MAX_TOTAL_TIMEOUT_MS ?? 60_000);
	const defaultMax = Number.isFinite(rawDefault) && rawDefault > 0 ? rawDefault : 60_000;
	if (!timeoutMs) return defaultMax;
	return Math.min(timeoutMs, defaultMax);
}

async function parseWithBrowserRetry(input: {
	requestedUrl: string;
	parser: (html: string, url: string) => PageData;
	policy: ResolvedPolicy;
	unlockResult: UnlockResult;
	totalTimeoutMs: number;
}): Promise<{
	unlockResult: UnlockResult;
	finalUrl: string;
	pageData?: PageData;
	parseError?: string;
}> {
	const firstFinalUrl = input.unlockResult.finalUrl ?? input.requestedUrl;

	if (input.unlockResult.error) {
		return {
			unlockResult: input.unlockResult,
			finalUrl: firstFinalUrl,
			parseError: `Unlock failed: ${input.unlockResult.error.message}`,
		};
	}

	if (input.unlockResult.body) {
		try {
			return {
				unlockResult: input.unlockResult,
				finalUrl: firstFinalUrl,
				pageData: input.parser(input.unlockResult.body, firstFinalUrl),
			};
		} catch (error) {
			const firstError =
				error instanceof Error ? error.message : "Parser failed";

			if (
				input.unlockResult.strategyUsed === "fetch" &&
				input.policy.allowedStrategies.includes("browser")
			) {
				const browserOnlyPolicy: ResolvedPolicy = {
					...input.policy,
					entryStrategy: "browser",
					allowedStrategies: ["browser"],
				};
				const browserResult = await unlock({
					url: input.requestedUrl,
					policy: browserOnlyPolicy,
					totalTimeoutMs: input.totalTimeoutMs,
				});
				const browserFinalUrl = browserResult.finalUrl ?? input.requestedUrl;

				if (browserResult.body) {
					try {
						return {
							unlockResult: browserResult,
							finalUrl: browserFinalUrl,
							pageData: input.parser(browserResult.body, browserFinalUrl),
						};
					} catch (browserError) {
						const browserMessage =
							browserError instanceof Error
								? browserError.message
								: "Parser failed after browser retry";
						return {
							unlockResult: browserResult,
							finalUrl: browserFinalUrl,
							parseError: `${firstError} | browser retry: ${browserMessage}`,
						};
					}
				}

				return {
					unlockResult: browserResult,
					finalUrl: browserFinalUrl,
					parseError: `${firstError} | browser retry returned no body`,
				};
			}

			return {
				unlockResult: input.unlockResult,
				finalUrl: firstFinalUrl,
				parseError: firstError,
			};
		}
	}

	return {
		unlockResult: input.unlockResult,
		finalUrl: firstFinalUrl,
		parseError: "No body returned for parser",
	};
}

export function createHttpApp(): Hono {
	const app = new Hono();

	app.get("/healthz", (c) => c.json({ status: "ok" }));

	app.post("/fetch", async (c) => {
		let rawJson: unknown;
		try {
			rawJson = await c.req.json();
		} catch {
			return c.json({ error: { type: "bad_request", message: "Body must be valid JSON" } }, 400);
		}

		const parsed = fetchRequestSchema.safeParse(rawJson);
		if (!parsed.success) {
			return c.json(
				{
					error: {
						type: "bad_request",
						message: "Invalid request payload",
						details: parsed.error.flatten(),
					},
				},
				400,
			);
		}

		const { format } = parsed.data;
		const targetUrl = new URL(parsed.data.url);

		try {
			const rulesConfig = await loadRulesConfig();
			const policy = resolvePolicyForUrl(targetUrl, rulesConfig);

			if (policy.unsupportedReason) {
				return c.json(
					{
						error: {
							type: "not_supported",
							message: policy.unsupportedReason,
						},
						policy: {
							domain: policy.canonicalDomain,
							rule_id: policy.matchedRuleId,
							parser: policy.parser,
							entry_strategy: policy.entryStrategy,
							allowed_strategies: policy.allowedStrategies,
						},
					},
					422,
				);
			}

			const totalTimeoutMs = clampTotalTimeout(parsed.data.timeout_ms);
			const unlockResult = await unlock({
				url: targetUrl.toString(),
				policy,
				totalTimeoutMs,
			});

			const makeResponseBase = (result: UnlockResult) => ({
				status_code: result.statusCode,
				headers: result.headers,
				final_url: result.finalUrl,
				format,
				strategy_used: result.strategyUsed,
				attempts: result.attempts,
				error: result.error,
				timing: { total_ms: result.timing.totalMs },
				policy: {
					domain: policy.canonicalDomain,
					rule_id: policy.matchedRuleId,
					parser: policy.parser,
					entry_strategy: policy.entryStrategy,
					allowed_strategies: policy.allowedStrategies,
				},
			});

			const initialFinalUrl = unlockResult.finalUrl ?? parsed.data.url;
			const responseBase = makeResponseBase(unlockResult);

			if (format === "html") {
				return c.json({ ...responseBase, body: unlockResult.body }, 200);
			}

			const parser = resolveParser(initialFinalUrl, policy.parser);

			if (!parser) {
				if (format === "json") {
					return c.json(
						{
							error: {
								type: "not_supported",
								message:
									"No structured parser available for this domain. Use format: 'markdown' instead.",
							},
						},
						422,
					);
				}
				// markdown with generic fallback
				let body: string | null = unlockResult.body;
				let title: string | null = null;
				if (unlockResult.body) {
					try {
						const genericData = parseGeneric(unlockResult.body, initialFinalUrl);
						body = toMarkdown(genericData);
						title = genericData.title;
					} catch {
						// Fall through to raw body
					}
				}
				return c.json(
					{
						...responseBase,
						error: typeof body === "string" && body.trim().length > 0 ? undefined : responseBase.error,
						body,
						title,
					},
					200,
				);
			}

			if (!unlockResult.body) {
				return c.json({ ...responseBase, body: null }, 200);
			}

			const parsedResult = await parseWithBrowserRetry({
				requestedUrl: targetUrl.toString(),
				parser,
				policy,
				unlockResult,
				totalTimeoutMs,
			});
			const finalResponseBase = makeResponseBase(parsedResult.unlockResult);

			if (!parsedResult.pageData) {
				if (format === "json") {
					return c.json(
						{
							...finalResponseBase,
							body: null,
							parser_error: parsedResult.parseError ?? "Parser failed",
						},
						200,
					);
				}
				return c.json({ ...finalResponseBase, body: parsedResult.unlockResult.body }, 200);
			}

			if (format === "json") {
				return c.json(
					{
						...finalResponseBase,
						error: undefined,
						body: parsedResult.pageData,
						title: parsedResult.pageData.title,
					},
					200,
				);
			}

			const md = toMarkdown(parsedResult.pageData);
			const CHALLENGE_RE =
				/checking if the site connection is secure|verify you are human|access denied/i;
			const isChallenge = !!parsedResult.unlockResult.error && CHALLENGE_RE.test(md);
			const body =
				md.length >= 50 && !isChallenge ? md : parsedResult.unlockResult.body;
			const title =
				md.length >= 50 && !isChallenge ? parsedResult.pageData.title : undefined;
			const hasUsableBody = typeof body === "string" && body.trim().length > 0;

			return c.json(
				{
					...finalResponseBase,
					error: hasUsableBody ? undefined : finalResponseBase.error,
					body,
					title,
				},
				200,
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Internal error";
			return c.json({ error: { type: "internal_error", message } }, 500);
		}
	});

	return app;
}

export async function startHttpServer(port: number): Promise<void> {
	const app = createHttpApp();
	console.log(`[owu] Starting HTTP server on port ${port}`);
	Bun.serve({
		port,
		fetch: app.fetch,
	});
	console.log(`[owu] Listening on http://0.0.0.0:${port}`);
}
