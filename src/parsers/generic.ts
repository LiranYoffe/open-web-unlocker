import { extractMarkdown } from "../html-to-markdown";
import type { GenericData } from "./page-data";

export function parseGeneric(html: string, url: string): GenericData {
	const result = extractMarkdown(html, url);
	return {
		type: "generic",
		title: result.title,
		url,
		content: result.markdown,
	};
}
