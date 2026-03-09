# Open Web Unlocker

Fetch web pages and search results and return either raw HTML, clean markdown, or structured JSON.

## CLI

```bash
bunx open-web-unlocker fetch "https://example.com"
```

`--format markdown` is the default.

```bash
bunx open-web-unlocker fetch "https://example.com/article" --format json
```

```bash
bunx open-web-unlocker fetch "https://example.com/article" --format html
```

```bash
bunx open-web-unlocker fetch "https://example.com/app" --timeout 45000
```

Bun and `bunx` are the preferred path. The published CLI is also compatible with Node and `npx`.

## MCP Server

```bash
bunx open-web-unlocker --mcp
```

Add it to Claude Code:

```bash
claude mcp add open-web-unlocker -- bunx open-web-unlocker --mcp
```

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

## Claude Code Skill

Install the skill to let Claude Code fetch and parse web pages:

```bash
bunx skills add https://github.com/LiranYoffe/open-web-unlocker --skill open-web-unlocker
```

## HTTP Server

```bash
bunx open-web-unlocker --http --port 3000
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

## Install

```bash
bunx open-web-unlocker --help
```

```bash
bun add -g open-web-unlocker
```

## Requirements

- Bun `>= 1.3.0` is the preferred runtime
- Node `>= 20` is also supported for the published CLI
- Development in this repo should use Bun

## Development

```bash
bun install
```

```bash
bun run typecheck
```

```bash
bun run build
```

```bash
bun run pack:dry-run
```

## Project Layout

- `src/site-config/`: domain aliases, defaults, and path rules
- `src/config.ts`: config validation and policy resolution
- `src/unlock.ts`: unlock orchestration across `fetch` and `browser`
- `src/parsers/`: site-specific and generic parsers
- `scripts/`: validation and parser-development tooling

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
