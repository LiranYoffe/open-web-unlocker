# Open Web Unlocker

Open Web Unlocker is a Bun-first tool for fetching public web pages through a configurable `fetch` / `browser` unlock pipeline and returning either:

- raw HTML
- cleaned markdown
- structured JSON from site-specific parsers

It can run as:

- a CLI
- an MCP server over stdio
- an HTTP server

## Highlights

- Bun-first runtime and tooling
- Domain and path-specific unlock policy
- `fetch`-first or `browser`-first behavior per site
- Structured parsers for many common public sites
- Generic markdown fallback for unsupported pages
- HTTP and MCP interfaces on top of the same core unlock/parsing pipeline

## Requirements

- Bun `>= 1.3.0`

## Install

Run without installing:

```bash
bunx open-web-unlocker --help
```

Install globally:

```bash
bun add -g open-web-unlocker
```

Install dependencies for development:

```bash
bun install
```

Build the package:

```bash
bun run build
```

Run checks:

```bash
bun run check
```

## CLI

Run directly from source during development:

```bash
bun run src/index.ts fetch "https://example.com" --format markdown
```

Run the built CLI:

```bash
bun dist/index.js fetch "https://example.com" --format json
```

Show help:

```bash
bun dist/index.js --help
```

### CLI examples

Fetch clean markdown:

```bash
bun dist/index.js fetch "https://example.com" --format markdown
```

Fetch structured JSON:

```bash
bun dist/index.js fetch "https://example.com/article" --format json
```

Set a custom total timeout:

```bash
bun dist/index.js fetch "https://example.com/app" --format json --timeout 45000
```

## MCP Server

Start the MCP server over stdio:

```bash
bun run src/index.ts --mcp
```

Or from the built output:

```bash
bun dist/index.js --mcp
```

The MCP server exposes a single `fetch` tool with:

- `url`
- `format`: `html`, `markdown`, or `json`
- `timeout_ms`

### Example MCP client config

```json
{
  "mcpServers": {
    "owu": {
      "command": "bun",
      "args": ["dist/index.js", "--mcp"]
    }
  }
}
```

## HTTP Server

Start the HTTP server:

```bash
bun run src/index.ts --http --port 3000
```

Or from the built output:

```bash
bun dist/index.js --http --port 3000
```

Health check:

```bash
curl http://localhost:3000/healthz
```

### `POST /fetch`

Request body:

```json
{
  "url": "https://example.com",
  "format": "markdown",
  "timeout_ms": 15000
}
```

Example:

```bash
curl -X POST http://localhost:3000/fetch \
  -H "content-type: application/json" \
  -d '{
    "url": "https://example.com",
    "format": "markdown"
  }'
```

Supported `format` values:

- `html`
- `markdown`
- `json`

## How it is organized

- `src/site-config/`
  - declarative domain aliases, defaults, and path rules
- `src/config.ts`
  - config validation and policy resolution
- `src/unlock.ts`
  - unlock orchestration across `fetch` and `browser`
- `src/parsers/`
  - site-specific and generic parsers
- `scripts/`
  - validation and parser-development tooling

## Development

Install dependencies:

```bash
bun install
```

Type check:

```bash
bun run typecheck
```

Build:

```bash
bun run build
```

Check what would be published to npm:

```bash
bun run pack:dry-run
```

## CI/CD

This repo includes:

- `CI`
  - install
  - typecheck
  - build
  - CLI smoke test
  - npm pack dry-run
- `Publish to npm`
  - GitHub Actions trusted publishing with `id-token: write`
  - `bunx npm publish --provenance --access public`
  - tag-driven release flow via `v*` tags

To use trusted publishing on npm, configure this GitHub repository as a trusted publisher for the package in npm settings.

## Notes

- This public repo intentionally excludes local agent workflow files, internal planning notes, and generated fixture snapshots.
- Some domains require browser-first or browser-only unlock flows because of consent or challenge pages.
- `Amazon /product-reviews/...` is intentionally unsupported.
- `TikTok Shop` is currently deferred because it is not testable from this environment.
