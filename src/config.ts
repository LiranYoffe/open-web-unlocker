import { z } from "zod";
import RULES_CONFIG from "./site-config/index";
import { STRATEGIES } from "./types";
import type {
	CompiledDomainConfig,
	CompiledPathRule,
	CompiledUnlockRulesConfig,
	UnlockRulesConfig,
} from "./types";

const strategyEnum = z.enum(STRATEGIES);

const matcherSchema = z.object({
	type: z.enum(["exact", "prefix", "regex"]),
	value: z.string().min(1),
});

const strategyListSchema = z
	.array(strategyEnum)
	.min(1)
	.refine((values) => new Set(values).size === values.length, {
		message: "Strategies must be unique",
	});

const browserActionSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("click"),
		selector: z.string().min(1),
		timeout_ms: z.number().int().positive().optional(),
		optional: z.boolean().optional(),
		frame_url_contains: z.string().min(1).optional(),
		frame_selector: z.string().min(1).optional(),
		wait_until: z.enum(["none", "domcontentloaded", "networkidle"]).optional(),
		post_wait_ms: z.number().int().nonnegative().optional(),
		force: z.boolean().optional(),
		position: z
			.object({
				x: z.number().nonnegative(),
				y: z.number().nonnegative(),
			})
			.optional(),
	}),
	z.object({
		type: z.literal("wait_for_selector"),
		selector: z.string().min(1),
		state: z.enum(["attached", "visible", "hidden", "detached"]).optional(),
		timeout_ms: z.number().int().positive().optional(),
		optional: z.boolean().optional(),
		frame_url_contains: z.string().min(1).optional(),
		frame_selector: z.string().min(1).optional(),
	}),
	z.object({
		type: z.literal("wait_for_load_state"),
		state: z.enum(["domcontentloaded", "networkidle"]),
		timeout_ms: z.number().int().positive().optional(),
		optional: z.boolean().optional(),
		frame_url_contains: z.string().min(1).optional(),
		frame_selector: z.string().min(1).optional(),
	}),
	z.object({
		type: z.literal("wait_for_timeout"),
		duration_ms: z.number().int().nonnegative(),
		timeout_ms: z.number().int().positive().optional(),
		optional: z.boolean().optional(),
		frame_url_contains: z.string().min(1).optional(),
		frame_selector: z.string().min(1).optional(),
	}),
]).superRefine((action, ctx) => {
	if (action.frame_url_contains && action.frame_selector) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "browser action can target at most one frame source",
			path: ["frame_selector"],
		});
	}
});

const policyOverrideFields = {
	allowed_strategies: strategyListSchema.optional(),
	entry_strategy: strategyEnum.optional(),
	fetch_timeout_ms: z.number().int().positive().optional(),
	browser_timeout_ms: z.number().int().positive().optional(),
	max_response_bytes: z.number().int().positive().optional(),
	browser_retries: z.number().int().min(0).max(5).optional(),
	include_shadow_dom: z.boolean().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	browser_actions: z.array(browserActionSchema).optional(),
} as const;

function validateEntryStrategy(
	entity: { allowed_strategies?: readonly string[]; entry_strategy?: string | undefined },
	ctx: z.RefinementCtx,
	message: string,
): void {
	if (
		entity.allowed_strategies &&
		entity.entry_strategy &&
		!entity.allowed_strategies.includes(entity.entry_strategy)
	) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message,
			path: ["entry_strategy"],
		});
	}
}

const pathRuleSchema = z
	.object({
		id: z.string().min(1),
		match: matcherSchema,
		...policyOverrideFields,
		parser: z.string().min(1).optional(),
		unsupported_reason: z.string().min(1).optional(),
		notes: z.string().optional(),
	})
	.superRefine((rule, ctx) => validateEntryStrategy(rule, ctx, "entry_strategy must be in allowed_strategies"));

const domainDefaultsSchema = z
	.object({
		...policyOverrideFields,
	})
	.superRefine((defaults, ctx) =>
		validateEntryStrategy(defaults, ctx, "domain.defaults.entry_strategy must be in domain.defaults.allowed_strategies"),
	);

const domainConfigSchema = z.object({
	defaults: domainDefaultsSchema.optional(),
	rules: z.array(pathRuleSchema).default([]),
});

export const unlockRulesConfigSchema = z
	.object({
		version: z.number().int().positive(),
		aliases: z.record(z.string().min(1), z.string().min(1)).default({}),
		domains: z.record(z.string().min(1), domainConfigSchema).default({}),
		defaults: z
			.object({
				allowed_strategies: strategyListSchema,
				entry_strategy: strategyEnum,
				fetch_timeout_ms: z.number().int().positive(),
				browser_timeout_ms: z.number().int().positive(),
				max_response_bytes: z.number().int().positive().optional(),
				headers: z.record(z.string(), z.string()).optional(),
			})
			.superRefine((defaults, ctx) => {
				if (!defaults.allowed_strategies.includes(defaults.entry_strategy)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "defaults.entry_strategy must be in defaults.allowed_strategies",
						path: ["entry_strategy"],
					});
				}
			}),
	})
	.superRefine((config, ctx) => {
		for (const [domain, domainConfig] of Object.entries(config.domains)) {
			const ids = new Set<string>();
			for (const rule of domainConfig.rules) {
				if (ids.has(rule.id)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Duplicate rule id '${rule.id}' in domain '${domain}'`,
						path: ["domains", domain, "rules"],
					});
					continue;
				}
				ids.add(rule.id);
			}
		}
	});

function normalizeDomain(domain: string): string {
	return domain.trim().toLowerCase().replace(/\.$/, "");
}

function compileRule(rule: CompiledPathRule): CompiledPathRule {
	if (rule.match.type !== "regex") {
		return rule;
	}
	return {
		...rule,
		compiledRegex: new RegExp(rule.match.value),
	};
}

function compileRulesConfig(config: UnlockRulesConfig): CompiledUnlockRulesConfig {
	const normalizedAliases: Record<string, string> = {};
	for (const [alias, canonical] of Object.entries(config.aliases)) {
		normalizedAliases[normalizeDomain(alias)] = normalizeDomain(canonical);
	}

	const compiledDomains: Record<string, CompiledDomainConfig> = {};
	for (const [domain, domainConfig] of Object.entries(config.domains)) {
		compiledDomains[normalizeDomain(domain)] = {
			defaults: domainConfig.defaults,
			rules: domainConfig.rules.map((rule) => compileRule(rule)),
		};
	}

	return {
		...config,
		aliases: normalizedAliases,
		domains: compiledDomains,
	};
}

let cachedConfig: CompiledUnlockRulesConfig | null = null;

export async function loadRulesConfig(): Promise<CompiledUnlockRulesConfig> {
	if (cachedConfig) {
		return cachedConfig;
	}

	const validated = unlockRulesConfigSchema.parse(RULES_CONFIG);
	cachedConfig = compileRulesConfig(validated);
	return cachedConfig;
}

export function resolveCanonicalDomain(
	host: string,
	config: CompiledUnlockRulesConfig,
): string {
	const normalized = normalizeDomain(host);
	if (config.aliases[normalized]) {
		return config.aliases[normalized];
	}
	if (normalized.startsWith("www.")) {
		const withoutWww = normalized.slice(4);
		return config.aliases[withoutWww] ?? withoutWww;
	}
	return normalized;
}

function matchesPath(pathname: string, rule: CompiledPathRule): boolean {
	const { type, value } = rule.match;
	if (type === "exact") {
		return pathname === value;
	}
	if (type === "prefix") {
		return pathname.startsWith(value);
	}
	return Boolean(rule.compiledRegex?.test(pathname));
}

function normalizeStrategies(strategies: import("./types").Strategy[]): import("./types").Strategy[] {
	const seen = new Set<import("./types").Strategy>();
	const ordered: import("./types").Strategy[] = [];
	for (const strategy of strategies) {
		if (seen.has(strategy)) continue;
		seen.add(strategy);
		ordered.push(strategy);
	}
	return ordered;
}

export function resolvePolicyForUrl(
	url: URL,
	config: CompiledUnlockRulesConfig,
): import("./types").ResolvedPolicy {
	const canonicalDomain = resolveCanonicalDomain(url.hostname, config);
	const domainConfig = config.domains[canonicalDomain];
	const domainDefaults = domainConfig?.defaults;
	const domainRules = domainConfig?.rules ?? [];

	let matchedRule: CompiledPathRule | undefined;
	for (const rule of domainRules) {
		if (matchesPath(url.pathname, rule)) {
			matchedRule = rule;
			break;
		}
	}

	const allowedStrategies = normalizeStrategies(
		matchedRule?.allowed_strategies ??
			domainDefaults?.allowed_strategies ??
			config.defaults.allowed_strategies,
	);

	const entryStrategyCandidate =
		matchedRule?.entry_strategy ??
		domainDefaults?.entry_strategy ??
		config.defaults.entry_strategy;
	const entryStrategy = allowedStrategies.includes(entryStrategyCandidate)
		? entryStrategyCandidate
		: allowedStrategies[0]!;

	const headers: Record<string, string> = {
		...(config.defaults.headers ?? {}),
		...(domainDefaults?.headers ?? {}),
		...(matchedRule?.headers ?? {}),
	};

	return {
		canonicalDomain,
		matchedRuleId: matchedRule?.id,
		allowedStrategies,
		entryStrategy,
		fetchTimeoutMs:
			matchedRule?.fetch_timeout_ms ??
			domainDefaults?.fetch_timeout_ms ??
			config.defaults.fetch_timeout_ms,
		browserTimeoutMs:
			matchedRule?.browser_timeout_ms ??
			domainDefaults?.browser_timeout_ms ??
			config.defaults.browser_timeout_ms,
		maxResponseBytes:
			matchedRule?.max_response_bytes ??
			domainDefaults?.max_response_bytes ??
			config.defaults.max_response_bytes ??
			5_000_000,
		browserRetries: matchedRule?.browser_retries ?? domainDefaults?.browser_retries ?? 1,
		includeShadowDom: matchedRule?.include_shadow_dom ?? domainDefaults?.include_shadow_dom ?? false,
		parser: matchedRule?.parser,
		unsupportedReason: matchedRule?.unsupported_reason,
		headers,
		browserActions: matchedRule?.browser_actions ?? domainDefaults?.browser_actions ?? [],
	};
}
