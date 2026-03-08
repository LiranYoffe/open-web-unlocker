import { loadRulesConfig, resolvePolicyForUrl } from "../config";
import { unlock } from "../unlock";
import { parseGeneric, resolveParser } from "../parsers";
import { toMarkdown } from "../parsers/to-markdown";

export interface CliOptions {
	format: "html" | "markdown" | "json";
	timeout?: number;
}

export async function runCli(url: string, options: CliOptions): Promise<void> {
	const targetUrl = new URL(url);
	const rulesConfig = await loadRulesConfig();
	const policy = resolvePolicyForUrl(targetUrl, rulesConfig);

	if (policy.unsupportedReason) {
		console.error(`[owu] Error: ${policy.unsupportedReason}`);
		process.exitCode = 2;
		return;
	}

	const result = await unlock({
		url: targetUrl.toString(),
		policy,
		totalTimeoutMs: options.timeout,
	});

	if (result.error) {
		console.error(
			`[owu] Warning: ${result.error.message} (strategy: ${result.strategyUsed ?? "none"})`,
		);
	}

	const finalUrl = result.finalUrl ?? url;

	if (options.format === "html") {
		process.stdout.write(result.body);
		return;
	}

	const parser = resolveParser(finalUrl, policy.parser);

	if (options.format === "json") {
		if (parser) {
			try {
				const pageData = parser(result.body, finalUrl);
				console.log(JSON.stringify(pageData, null, 2));
				return;
			} catch {
				// Fall through to generic
			}
		}
		const genericData = parseGeneric(result.body, finalUrl);
		console.log(JSON.stringify(genericData, null, 2));
		return;
	}

	// markdown
	if (parser) {
		try {
			const pageData = parser(result.body, finalUrl);
			const md = toMarkdown(pageData);
			if (md.length >= 50) {
				process.stdout.write(md + "\n");
				return;
			}
		} catch {
			// Fall through to generic
		}
	}

	const genericData = parseGeneric(result.body, finalUrl);
	const md = toMarkdown(genericData);
	process.stdout.write(md + "\n");
}
