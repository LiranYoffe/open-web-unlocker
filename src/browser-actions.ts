import type { Frame, Locator, Page } from "playwright-core";
import type { BrowserAction } from "./types";

function actionTimeoutMs(action: BrowserAction): number {
	return action.timeout_ms && action.timeout_ms > 0 ? action.timeout_ms : 5000;
}

function hasFrameTarget(action: BrowserAction): boolean {
	return Boolean(action.frame_selector || action.frame_url_contains);
}

async function resolveFrameBySelector(
	page: Page,
	selector: string,
	timeout: number,
): Promise<Frame | null> {
	const startedAt = Date.now();
	const locator = page.locator(selector).first();

	while (Date.now() - startedAt < timeout) {
		try {
			await locator.waitFor({
				state: "attached",
				timeout: Math.min(500, timeout - (Date.now() - startedAt)),
			});
			const handle = await locator.elementHandle();
			const frame = await handle?.contentFrame();
			if (frame) {
				return frame;
			}
		} catch {
			// Keep polling until timeout.
		}

		await page.waitForTimeout(100);
	}

	return null;
}

async function resolveFrameByUrl(
	page: Page,
	urlSubstring: string,
	timeout: number,
): Promise<Frame | null> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeout) {
		const frame = page.frames().find((candidate) => candidate.url().includes(urlSubstring));
		if (frame) {
			return frame;
		}
		await page.waitForTimeout(100);
	}
	return null;
}

async function resolveActionTarget(page: Page, action: BrowserAction): Promise<Page | Frame> {
	const timeout = actionTimeoutMs(action);
	if (action.frame_selector) {
		const frame = await resolveFrameBySelector(page, action.frame_selector, timeout);
		if (!frame) {
			throw new Error(
				`Browser action failed: frame selector not found or not attached: ${action.frame_selector}`,
			);
		}
		return frame;
	}

	if (action.frame_url_contains) {
		const frame = await resolveFrameByUrl(page, action.frame_url_contains, timeout);
		if (!frame) {
			throw new Error(
				`Browser action failed: frame URL fragment not found: ${action.frame_url_contains}`,
			);
		}
		return frame;
	}

	return page;
}

function locatorForTarget(target: Page | Frame, selector: string): Locator {
	return target.locator(selector).first();
}

async function waitForLocatorBox(
	page: Page,
	locator: Locator,
	timeout: number,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeout) {
		try {
			const box = await locator.boundingBox();
			if (box && box.width > 0 && box.height > 0) {
				return box;
			}
		} catch {
			// Keep polling until timeout.
		}

		await page.waitForTimeout(100);
	}

	return null;
}

async function runClickAction(page: Page, action: Extract<BrowserAction, { type: "click" }>): Promise<void> {
	const timeout = actionTimeoutMs(action);
	const target = await resolveActionTarget(page, action);
	const locator = locatorForTarget(target, action.selector);
	await locator.waitFor({ state: "attached", timeout });

	try {
		await locator.click({
			timeout,
			force: action.force,
			position: action.position,
		});
	} catch (error) {
		const box = await waitForLocatorBox(page, locator, timeout);
		if (!box) {
			throw error;
		}

		const clickX = box.x + (action.position?.x ?? box.width / 2);
		const clickY = box.y + (action.position?.y ?? box.height / 2);
		await page.mouse.click(clickX, clickY);
	}

	const waitUntil = action.wait_until ?? "domcontentloaded";
	if (waitUntil !== "none") {
		await page.waitForLoadState(waitUntil, { timeout });
	}
	if (action.post_wait_ms && action.post_wait_ms > 0) {
		await page.waitForTimeout(action.post_wait_ms);
	}
}

async function runWaitForSelectorAction(
	page: Page,
	action: Extract<BrowserAction, { type: "wait_for_selector" }>,
): Promise<void> {
	const target = await resolveActionTarget(page, action);
	await target.waitForSelector(action.selector, {
		state: action.state ?? "visible",
		timeout: actionTimeoutMs(action),
	});
}

async function runWaitForLoadStateAction(
	page: Page,
	action: Extract<BrowserAction, { type: "wait_for_load_state" }>,
): Promise<void> {
	if (hasFrameTarget(action)) {
		await resolveActionTarget(page, action);
	}
	await page.waitForLoadState(action.state, {
		timeout: actionTimeoutMs(action),
	});
}

async function runWaitForTimeoutAction(
	page: Page,
	action: Extract<BrowserAction, { type: "wait_for_timeout" }>,
): Promise<void> {
	if (hasFrameTarget(action)) {
		await resolveActionTarget(page, action);
	}
	await page.waitForTimeout(action.duration_ms);
}

export async function runBrowserActions(page: Page, actions: BrowserAction[]): Promise<void> {
	for (const action of actions) {
		try {
			if (action.type === "click") {
				await runClickAction(page, action);
				continue;
			}
			if (action.type === "wait_for_selector") {
				await runWaitForSelectorAction(page, action);
				continue;
			}
			if (action.type === "wait_for_timeout") {
				await runWaitForTimeoutAction(page, action);
				continue;
			}
			await runWaitForLoadStateAction(page, action);
		} catch (error) {
			if (action.optional) continue;
			throw error;
		}
	}
}
