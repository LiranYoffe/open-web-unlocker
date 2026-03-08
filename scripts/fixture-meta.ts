import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface FixtureMeta {
	name: string;
	url: string;
	finalUrl: string;
	strategyUsed: string | null;
	statusCode: number;
	policy: {
		domain: string;
		ruleId: string | null;
		parser: string | null;
		entryStrategy: string;
		allowedStrategies: string[];
	};
}

export function fixturesDir(): string {
	return resolve(import.meta.dir, "fixtures");
}

export function fixturePath(name: string, ext: string): string {
	return resolve(fixturesDir(), `${name}.${ext}`);
}

export function readFixtureMeta(name: string): FixtureMeta | null {
	const path = fixturePath(name, "meta.json");
	if (!existsSync(path)) {
		return null;
	}
	return JSON.parse(readFileSync(path, "utf-8")) as FixtureMeta;
}
