import { Camoufox } from "camoufox-js";
import type { Page, Response } from "playwright-core";
import type { BrowserAttemptInput, UpstreamPayload } from "./types";
import { runBrowserActions } from "./browser-actions";
import { getErrorMessage } from "./utils";

const PHASE1_TIMEOUT_MS = 5000;
const PHASE2_TIMEOUT_MS = 2000;
const SPA_CONTENT_POLL_MS = 500;
const SPA_MIN_TEXT_LENGTH = 200;
const MAIN_CONTENT_MIN_TEXT_LENGTH = 80;
const READY_STATE_STABILITY_POLLS = 2;

const DEFAULT_TOTAL_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 5_000_000;

const CHALLENGE_TEXT_RE =
	/just a moment|one moment, please|cloudflare|verify you are human|checking your browser before|checking if the site connection is secure|your browser will redirect to your requested content shortly|verification successful\.\s*waiting for|verify that you(?:'|’)re a real person|confirming that you are a real person|help us protect glassdoor|we must verify your session before you can proceed|enable javascript and cookies to continue/i;

interface PageSignals {
	title: string;
	textLength: number;
	hasMainLikeContent: boolean;
	hasStructuredData: boolean;
	hasChallenge: boolean;
}

const EMPTY_PAGE_SIGNALS: PageSignals = {
	title: "",
	textLength: 0,
	hasMainLikeContent: false,
	hasStructuredData: false,
	hasChallenge: false,
};

function resolveMaxResponseBytes(): number {
	const raw = Number(process.env.MAX_RESPONSE_BYTES ?? DEFAULT_MAX_RESPONSE_BYTES);
	return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_RESPONSE_BYTES;
}

async function readPageSignals(page: Page): Promise<PageSignals> {
	const snapshot = await page.evaluate(() => {
		const title = document.title?.trim() || "";
		const bodyText = document.body?.innerText?.trim() || "";
		return {
			title,
			bodyTextSample: bodyText.slice(0, 4000),
			textLength: bodyText.length,
			hasMainLikeContent: Boolean(
				document.querySelector("main, article, [role='main'], h1, h2"),
			),
			hasStructuredData: Boolean(
				document.querySelector(
					"script[type='application/ld+json'], script#__NEXT_DATA__, script#__NUXT_DATA__",
				),
			),
			hasChallengeSelector: Boolean(
				document.querySelector(
					"script[src*='challenge-platform'], iframe[src*='challenges.cloudflare.com'], [id^='cf-chl-widget'], #challenge-form, #challenge-running",
				),
			),
		};
	});

	return {
		title: snapshot.title,
		textLength: snapshot.textLength,
		hasMainLikeContent: snapshot.hasMainLikeContent,
		hasStructuredData: snapshot.hasStructuredData,
		hasChallenge:
			snapshot.hasChallengeSelector ||
			CHALLENGE_TEXT_RE.test(`${snapshot.title}\n${snapshot.bodyTextSample}`),
	};
}

function hasMeaningfulContent(signals: PageSignals): boolean {
	if (signals.hasChallenge) {
		return false;
	}
	if (signals.hasStructuredData) {
		return true;
	}
	if (signals.textLength >= SPA_MIN_TEXT_LENGTH) {
		return true;
	}
	return signals.hasMainLikeContent && signals.textLength >= MAIN_CONTENT_MIN_TEXT_LENGTH;
}

function signalsSignature(signals: PageSignals): string {
	return [
		signals.title,
		Math.floor(signals.textLength / 25),
		signals.hasMainLikeContent ? "main" : "no-main",
		signals.hasStructuredData ? "structured" : "plain",
		signals.hasChallenge ? "challenge" : "content",
	].join("|");
}

async function waitForUsefulContent(
	page: Page,
	remainingMs: () => number,
	throwUnlessTimeout: (error: unknown) => void,
): Promise<PageSignals> {
	let signals = await readPageSignals(page).catch(() => EMPTY_PAGE_SIGNALS);
	let lastSignature = signalsSignature(signals);
	let stableReadyPolls = hasMeaningfulContent(signals) ? 1 : 0;

	while (remainingMs() > 500) {
		if (hasMeaningfulContent(signals) && stableReadyPolls >= READY_STATE_STABILITY_POLLS) {
			break;
		}

		await page.waitForTimeout(Math.min(SPA_CONTENT_POLL_MS, remainingMs()));

		const nextSignals = await readPageSignals(page).catch(() => signals);
		if (signals.hasChallenge && !nextSignals.hasChallenge && remainingMs() > 500) {
			try {
				await page.waitForLoadState("networkidle", {
					timeout: Math.min(1500, remainingMs()),
				});
			} catch (error) {
				throwUnlessTimeout(error);
			}
		}

		const nextSignature = signalsSignature(nextSignals);
		if (hasMeaningfulContent(nextSignals)) {
			stableReadyPolls = nextSignature === lastSignature ? stableReadyPolls + 1 : 1;
		} else {
			stableReadyPolls = 0;
		}

		signals = nextSignals;
		lastSignature = nextSignature;
	}

	return signals;
}

async function applyConfiguredActionsWithChallengeRetry(input: {
	page: Page;
	actions: BrowserAttemptInput["actions"];
	remainingMs: () => number;
	throwUnlessTimeout: (error: unknown) => void;
}): Promise<PageSignals> {
	if (!input.actions || input.actions.length === 0) {
		return readPageSignals(input.page).catch(() => EMPTY_PAGE_SIGNALS);
	}

	let signals = await readPageSignals(input.page).catch(() => EMPTY_PAGE_SIGNALS);
	const maxPasses = 3;

	for (let pass = 0; pass < maxPasses && input.remainingMs() > 500; pass += 1) {
		await runBrowserActions(input.page, input.actions);

		try {
			await input.page.waitForLoadState("networkidle", {
				timeout: Math.min(PHASE2_TIMEOUT_MS, input.remainingMs()),
			});
		} catch (error) {
			input.throwUnlessTimeout(error);
		}

		signals = await waitForUsefulContent(
			input.page,
			input.remainingMs,
			input.throwUnlessTimeout,
		);

		if (!signals.hasChallenge || hasMeaningfulContent(signals)) {
			break;
		}
	}

	return signals;
}

function serializeDocumentWithShadowDom(): string {
	const cloneNodeWithShadow = (node: Node, doc: Document): Node => {
		if (node.nodeType === Node.TEXT_NODE) {
			return doc.createTextNode(node.textContent ?? "");
		}
		if (node.nodeType === Node.COMMENT_NODE) {
			return doc.createComment((node as Comment).data);
		}
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return doc.createTextNode("");
		}

		const sourceEl = node as Element;
		const clonedEl = doc.createElementNS(sourceEl.namespaceURI, sourceEl.tagName);
		for (const attr of sourceEl.getAttributeNames()) {
			const value = sourceEl.getAttribute(attr);
			if (value !== null) {
				clonedEl.setAttribute(attr, value);
			}
		}

		const shadowRoot = (sourceEl as HTMLElement).shadowRoot;
		if (shadowRoot) {
			const template = doc.createElement("template");
			template.setAttribute("shadowroot", "open");
			for (const child of Array.from(shadowRoot.childNodes)) {
				template.content.appendChild(cloneNodeWithShadow(child, doc));
			}
			clonedEl.appendChild(template);

			const shadowDump = doc.createElement("owu-shadow-root");
			shadowDump.setAttribute("data-host-tag", sourceEl.tagName.toLowerCase());
			for (const child of Array.from(shadowRoot.childNodes)) {
				shadowDump.appendChild(cloneNodeWithShadow(child, doc));
			}
			clonedEl.appendChild(shadowDump);
		}

		if (sourceEl instanceof HTMLTemplateElement) {
			const targetTemplate = clonedEl as HTMLTemplateElement;
			for (const child of Array.from(sourceEl.content.childNodes)) {
				targetTemplate.content.appendChild(cloneNodeWithShadow(child, doc));
			}
			return targetTemplate;
		}

		for (const child of Array.from(sourceEl.childNodes)) {
			clonedEl.appendChild(cloneNodeWithShadow(child, doc));
		}

		return clonedEl;
	};

	const doc = document.implementation.createHTMLDocument("");
	const html = cloneNodeWithShadow(document.documentElement, doc) as HTMLElement;
	return "<!DOCTYPE html>\n" + html.outerHTML;
}

export async function runBrowserAttempt(input: BrowserAttemptInput): Promise<UpstreamPayload> {
	const startTime = Date.now();
	const totalTimeout = input.timeoutMs || DEFAULT_TOTAL_TIMEOUT_MS;
	const maxResponseBytes = input.maxResponseBytes ?? resolveMaxResponseBytes();

	// Camoufox handles fingerprint rotation automatically.
	// Use browser.newPage() directly to stay in Camoufox's default context.
	const browser = await Camoufox({ headless: true });

	let lastNavigationStatus = 0;

	const throwUnlessTimeout = (error: unknown): void => {
		if (!getErrorMessage(error).includes("Timeout")) {
			throw error;
		}
	};

	try {
		const page: Page = await browser.newPage();

		// Track HTTP status from navigation responses
		page.on("response", (response: Response) => {
			if (!response.request().isNavigationRequest()) return;
			lastNavigationStatus = response.status();
		});

		const referer = input.headers?.["referer"] ?? input.headers?.["Referer"] ?? undefined;
		const remainingMs = () => Math.max(0, totalTimeout - (Date.now() - startTime));
		try {
			await page.goto(input.url, {
				waitUntil: "domcontentloaded",
				timeout: PHASE1_TIMEOUT_MS,
				referer,
			});
		} catch (error) {
			throwUnlessTimeout(error);
		}

		let signals = await applyConfiguredActionsWithChallengeRetry({
			page,
			actions: input.actions,
			remainingMs,
			throwUnlessTimeout,
		});

		if (!input.actions || input.actions.length === 0) {
			try {
				await page.waitForLoadState("networkidle", {
					timeout: Math.min(PHASE2_TIMEOUT_MS, remainingMs()),
				});
			} catch (error) {
				throwUnlessTimeout(error);
			}
			signals = await waitForUsefulContent(page, remainingMs, throwUnlessTimeout);
		}

		if (!signals.hasChallenge && hasMeaningfulContent(signals) && remainingMs() > 500) {
			try {
				await page.waitForLoadState("networkidle", {
					timeout: Math.min(1500, remainingMs()),
				});
			} catch (error) {
				throwUnlessTimeout(error);
			}
		}

		const html = input.includeShadowDom
			? await page.evaluate(serializeDocumentWithShadowDom)
			: await page.content();
		const htmlBytes = Buffer.byteLength(html, "utf8");
		if (htmlBytes > maxResponseBytes) {
			throw new Error("Response too large");
		}
		const finalUrl = page.url();

		return {
			statusCode: lastNavigationStatus || 200,
			headers: {},
			body: html,
			finalUrl,
		};
	} finally {
		try {
			await browser.close();
		} catch {
			// ignore
		}
	}
}
