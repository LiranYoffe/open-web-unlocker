---
name: open-web-unlocker-fetch
description: >
  Guides using Open Web Unlocker's fetch command without installing it first.
  Use this skill whenever the user wants to fetch a page with
  `npx open-web-unlocker` or `bunx open-web-unlocker`, asks which output format
  to use (markdown/html/json), wants clean page content instead of raw HTML, or
  wants structured extracted data from a web page or search results page.
---

# Open Web Unlocker Fetch

Use this skill for fetch guidance without installation.

## Main usage

```bash
npx open-web-unlocker fetch <url>
bunx open-web-unlocker fetch <url>
```

With format selection:

```bash
npx open-web-unlocker fetch <url> --format markdown
npx open-web-unlocker fetch <url> --format json
npx open-web-unlocker fetch <url> --format html
```

With a longer timeout:

```bash
npx open-web-unlocker fetch <url> --timeout 45000
```

## What fetch is for

- static pages
- JavaScript-rendered pages
- pages that may need browser fallback, anti-bot handling, or CAPTCHA/challenge bypass
- web search result pages

## Search engines

Supported search engines include:

- Brave
- Bing
- DuckDuckGo

Google is not supported.

## Fetch options

### `--format`

Defaults to `markdown`.

Use `markdown` in normal cases. It is the recommended output because many common pages use site-specific parsers, and the markdown is generated from the structured extracted data while removing junk such as:

- navigation menus
- footers
- cookie consent screens
- generic boilerplate

Use `html` only when you want the full raw page, including that junk.

Use `json` only when you want the extracted structured data directly.

If no site-specific parser exists for the page, the fallback is generic markdown, which may include more junk.

So the rule is:

- default to `markdown`
- switch to `json` only when structured extracted fields are wanted explicitly
- switch to `html` only when the raw page is wanted explicitly

### `--timeout`

Optional total time budget in milliseconds.

By default there is no explicit CLI-wide total timeout. The fetch pipeline uses per-site strategy timeouts from its rules instead, which are typically `8000ms` for fetch and `15000ms` for browser unless a specific site overrides them.

Increase `--timeout` for JavaScript-heavy pages, slower sites, or pages that may need browser fallback or anti-bot handling.
