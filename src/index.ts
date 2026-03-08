#!/usr/bin/env node
import { Command } from "commander";
import { runCli } from "./modes/cli";
import { startHttpServer } from "./modes/http";
import { startMcpServer } from "./modes/mcp";
import pkg from "../package.json";

const program = new Command();

program
	.name("owu")
	.description("Open Web Unlocker — fetch and parse web pages")
	.version(pkg.version);

program
	.command("fetch <url>")
	.description("Fetch and parse a URL")
	.option("-f, --format <format>", "Output format: html, markdown, json", "markdown")
	.option("-t, --timeout <ms>", "Timeout in milliseconds", parseInt)
	.action(async (url: string, opts: { format: string; timeout?: number }) => {
		const format = opts.format as "html" | "markdown" | "json";
		if (!["html", "markdown", "json"].includes(format)) {
			console.error(`Invalid format: ${opts.format}. Use html, markdown, or json.`);
			process.exit(1);
		}
		await runCli(url, { format, timeout: opts.timeout });
	});

program
	.option("--http", "Start HTTP server mode")
	.option("--mcp", "Start MCP server mode (stdio)")
	.option("-p, --port <port>", "HTTP server port", "3000");

program.action(async (opts: { http?: boolean; mcp?: boolean; port: string }) => {
	if (opts.http) {
		await startHttpServer(parseInt(opts.port, 10));
	} else if (opts.mcp) {
		await startMcpServer();
	} else {
		program.help();
	}
});

program.parse();
