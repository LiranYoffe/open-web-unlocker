import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { loadRulesConfig, resolvePolicyForUrl } from "../config";
import { unlock } from "../unlock";
import { parseGeneric, resolveParser } from "../parsers";
import { toMarkdown } from "../parsers/to-markdown";

interface FetchToolArgs {
	url: string;
	format: "html" | "markdown" | "json";
	timeout_ms?: number;
}

export async function startMcpServer(): Promise<void> {
	const server = new McpServer({
		name: "open-web-unlocker",
		version: "0.1.0",
	});

	const fetchToolConfig: any = {
		description:
			"Fetch anything from the web. Supports static pages, JavaScript-rendered pages, many anti-bot/CAPTCHA-protected pages, and web search result pages. Supported search engines include Brave, Bing, and DuckDuckGo. Google is not supported. By default this tool returns markdown generated from structured extracted data, using site-specific parsers for many common pages to cut out junk such as navigation menus, footers, cookie consent screens, and similar boilerplate. Use html only when you need the full raw page including that junk. Use json only when you want the extracted structured form directly. If no site-specific parser exists for a page, the fallback is generic markdown, which may include more junk.",
		inputSchema: {
			url: z
				.string()
				.url()
				.describe("The full absolute URL to fetch. This can be a normal page URL or a supported search results URL."),
			format: z
				.enum(["html", "markdown", "json"])
				.default("markdown")
				.describe("Output format. Defaults to markdown and should usually stay that way. Use markdown for the normal clean result: many common pages, including many supported search result pages, use site-specific parsers that remove junk like navigation menus, footers, and cookie or consent UI; the markdown is generated from the extracted structured data. Use html only when you want the full raw page including that junk. Use json only when you want the extracted structured data directly. If no site-specific parser exists, the fallback is generic markdown, which may include more junk."),
			timeout_ms: z
				.number()
				.int()
				.positive()
				.max(60_000)
				.optional()
				.describe("Total time budget for the request in milliseconds. Defaults to 60000 in MCP mode. Increase this for slower JavaScript-heavy pages, browser fallbacks, supported search pages that load slowly, or anti-bot/CAPTCHA flows. Maximum 60000."),
		},
	};

	server.registerTool(
		"fetch",
		fetchToolConfig,
		(async ({ url, format, timeout_ms }: FetchToolArgs) => {
			try {
				const targetUrl = new URL(url);
				const rulesConfig = await loadRulesConfig();
				const policy = resolvePolicyForUrl(targetUrl, rulesConfig);

				if (policy.unsupportedReason) {
					return {
						content: [{ type: "text" as const, text: `Error: ${policy.unsupportedReason}` }],
						isError: true,
					};
				}

				const result = await unlock({
					url: targetUrl.toString(),
					policy,
					totalTimeoutMs: timeout_ms ?? 60_000,
				});

				const finalUrl = result.finalUrl ?? url;

				if (format === "html") {
					return {
						content: [{ type: "text" as const, text: result.body }],
					};
				}

				const parser = resolveParser(finalUrl, policy.parser);

				if (format === "json") {
					if (parser) {
						try {
							const pageData = parser(result.body, finalUrl);
							return {
								content: [
									{ type: "text" as const, text: JSON.stringify(pageData, null, 2) },
								],
							};
						} catch {
							// Fall through
						}
					}
					const genericData = parseGeneric(result.body, finalUrl);
					return {
						content: [
							{ type: "text" as const, text: JSON.stringify(genericData, null, 2) },
						],
					};
				}

				// markdown
				if (parser) {
					try {
						const pageData = parser(result.body, finalUrl);
						const md = toMarkdown(pageData);
						if (md.length >= 50) {
							return { content: [{ type: "text" as const, text: md }] };
						}
					} catch {
						// Fall through to generic
					}
				}

				const genericData = parseGeneric(result.body, finalUrl);
				const md = toMarkdown(genericData);
				return { content: [{ type: "text" as const, text: md }] };
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error";
				return {
					content: [{ type: "text" as const, text: `Error: ${message}` }],
					isError: true,
				};
			}
		}) as any,
	);

	const transport = new StdioServerTransport();
	await server.connect(transport);
}
