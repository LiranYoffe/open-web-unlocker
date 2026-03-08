export function isTimeoutError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	return error.name === "AbortError" || error.message.toLowerCase().includes("timeout");
}

export function normalizeErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	return "Unknown error";
}

export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Unknown error";
}

export function headersToObject(headers: Headers): Record<string, string> {
	const output: Record<string, string> = {};
	headers.forEach((value, key) => {
		output[key] = value;
	});
	return output;
}

export function normalizeHeaders(value: unknown): Record<string, string> {
	if (!value || typeof value !== "object") {
		return {};
	}

	const output: Record<string, string> = {};
	for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
		if (typeof raw === "string") {
			output[key.toLowerCase()] = raw;
		} else if (typeof raw === "number" || typeof raw === "boolean") {
			output[key.toLowerCase()] = String(raw);
		}
	}
	return output;
}
