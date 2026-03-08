export const STRATEGIES = ["fetch", "browser"] as const;

export type Strategy = (typeof STRATEGIES)[number];

export type ClassificationOutcome =
	| "success"
	| "blocked"
	| "js_required"
	| "not_found"
	| "bad_request"
	| "rate_limited"
	| "upstream_error";

export interface UpstreamPayload {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
	finalUrl: string;
}

export interface Classification {
	outcome: ClassificationOutcome;
	classifier: string;
	isBlocked: boolean;
	isJsRequired: boolean;
	isTerminal: boolean;
}

export interface AttemptTrace {
	strategy: Strategy;
	outcome: ClassificationOutcome;
	classifier: string;
	latency_ms: number;
	http_status?: number;
	error?: string;
}

export interface UnlockError {
	type: ClassificationOutcome | "internal_error";
	message: string;
}

export interface BrowserActionBase {
	timeout_ms?: number;
	optional?: boolean;
	frame_url_contains?: string;
	frame_selector?: string;
}

export interface BrowserClickAction extends BrowserActionBase {
	type: "click";
	selector: string;
	wait_until?: "none" | "domcontentloaded" | "networkidle";
	post_wait_ms?: number;
	force?: boolean;
	position?: {
		x: number;
		y: number;
	};
}

export interface BrowserWaitForSelectorAction extends BrowserActionBase {
	type: "wait_for_selector";
	selector: string;
	state?: "attached" | "visible" | "hidden" | "detached";
}

export interface BrowserWaitForLoadStateAction extends BrowserActionBase {
	type: "wait_for_load_state";
	state: "domcontentloaded" | "networkidle";
}

export interface BrowserWaitForTimeoutAction extends BrowserActionBase {
	type: "wait_for_timeout";
	duration_ms: number;
}

export type BrowserAction =
	| BrowserClickAction
	| BrowserWaitForSelectorAction
	| BrowserWaitForLoadStateAction
	| BrowserWaitForTimeoutAction;

export interface UnlockResult {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
	finalUrl?: string;
	strategyUsed?: Strategy;
	attempts: AttemptTrace[];
	error?: UnlockError;
	timing: {
		totalMs: number;
	};
}

interface UnlockRuleMatcher {
	type: "exact" | "prefix" | "regex";
	value: string;
}

export interface UnlockPathRule {
	id: string;
	match: UnlockRuleMatcher;
	allowed_strategies?: Strategy[];
	entry_strategy?: Strategy;
	fetch_timeout_ms?: number;
	browser_timeout_ms?: number;
	max_response_bytes?: number;
	browser_retries?: number;
	include_shadow_dom?: boolean;
	parser?: string;
	unsupported_reason?: string;
	headers?: Record<string, string>;
	browser_actions?: BrowserAction[];
	notes?: string;
}

export interface UnlockDomainDefaults {
	allowed_strategies?: Strategy[];
	entry_strategy?: Strategy;
	fetch_timeout_ms?: number;
	browser_timeout_ms?: number;
	max_response_bytes?: number;
	browser_retries?: number;
	include_shadow_dom?: boolean;
	headers?: Record<string, string>;
	browser_actions?: BrowserAction[];
}

export interface UnlockDomainConfig {
	defaults?: UnlockDomainDefaults;
	rules: UnlockPathRule[];
}

export interface UnlockRulesConfig {
	version: number;
	aliases: Record<string, string>;
	domains: Record<string, UnlockDomainConfig>;
	defaults: {
		allowed_strategies: Strategy[];
		entry_strategy: Strategy;
		fetch_timeout_ms: number;
		browser_timeout_ms: number;
		max_response_bytes?: number;
		headers?: Record<string, string>;
	};
}

export interface CompiledPathRule extends UnlockPathRule {
	compiledRegex?: RegExp;
}

export interface CompiledDomainConfig extends Omit<UnlockDomainConfig, "rules"> {
	rules: CompiledPathRule[];
}

export interface CompiledUnlockRulesConfig extends UnlockRulesConfig {
	domains: Record<string, CompiledDomainConfig>;
}

export interface ResolvedPolicy {
	canonicalDomain: string;
	matchedRuleId?: string;
	allowedStrategies: Strategy[];
	entryStrategy: Strategy;
	fetchTimeoutMs: number;
	browserTimeoutMs: number;
	maxResponseBytes: number;
	browserRetries: number;
	includeShadowDom: boolean;
	parser?: string;
	unsupportedReason?: string;
	headers: Record<string, string>;
	browserActions: BrowserAction[];
}

export interface FetchAttemptInput {
	url: string;
	timeoutMs: number;
	headers?: Record<string, string>;
	maxResponseBytes?: number;
}

export interface BrowserAttemptInput {
	url: string;
	timeoutMs: number;
	headers?: Record<string, string>;
	actions?: BrowserAction[];
	maxResponseBytes?: number;
	includeShadowDom?: boolean;
}
