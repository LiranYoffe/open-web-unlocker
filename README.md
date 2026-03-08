# Open Web Unlocker

Fetch web pages and search results and return either raw HTML, clean markdown, or structured JSON.

## Highlights

- Bun-first runtime and tooling
- Domain and path-specific unlock policy
- `fetch`-first or `browser`-first behavior per site
- Structured parsers for many common public sites
- Generic markdown fallback for unsupported pages
- HTTP and MCP interfaces on top of the same core unlock/parsing pipeline

## CLI

Preferred no-install usage:

```bash
bunx open-web-unlocker fetch "https://example.com"
```

Node and `npx` are also supported, but Bun and `bunx` are the preferred path.

`--format markdown` is the default.

Fetch structured JSON:

```bash
bunx open-web-unlocker fetch "https://example.com/article" --format json
```

Fetch raw HTML:

```bash
bunx open-web-unlocker fetch "https://example.com/article" --format html
```

Set a custom total timeout:

```bash
bunx open-web-unlocker fetch "https://example.com/app" --timeout 45000
```

For fetch guidance in agent environments, see the bundled skill at `skills/open-web-unlocker-fetch/`.

## MCP Server

Preferred:

```bash
bunx open-web-unlocker --mcp
```

Node-compatible:

Node and `npx` are also supported here, but Bun and `bunx` are the preferred path.

The MCP server exposes a single `fetch` tool with:

- `url`
- `format`: `html`, `markdown`, or `json`
- `timeout_ms`

Add it to Claude Code:

```bash
claude mcp add open-web-unlocker -- bunx open-web-unlocker --mcp
```

Node-compatible alternative:

Example MCP client config:

```json
{
  "mcpServers": {
    "open-web-unlocker": {
      "command": "bunx",
      "args": ["open-web-unlocker", "--mcp"]
    }
  }
}
```

## HTTP Server

Preferred:

```bash
bunx open-web-unlocker --http --port 3000
```

Node-compatible:

Node and `npx` are also supported here, but Bun and `bunx` are the preferred path.

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

## Requirements

- Bun `>= 1.3.0` is the preferred runtime for users
- Node `>= 20` is also supported for the published CLI
- Development in this repo should use Bun

## Install

Run without installing:

```bash
bunx open-web-unlocker --help
```

Install globally:

```bash
bun add -g open-web-unlocker
```

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

Run directly from source during development:

```bash
bun run src/index.ts fetch "https://example.com"
```

Run the built CLI:

```bash
node dist/index.js fetch "https://example.com" --format json
```

## CI/CD

This repo includes:

- `CI`
  - install
  - typecheck
  - build
  - Node CLI smoke test
  - npm pack dry-run
- `Publish to npm`
  - GitHub Actions trusted publishing with `id-token: write`
  - `npm publish --provenance --access public`
  - tag-driven release flow via `v*` tags

To use trusted publishing on npm, configure this GitHub repository as a trusted publisher for the package in npm settings.
