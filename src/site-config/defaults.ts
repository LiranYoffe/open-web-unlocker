import type { UnlockRulesConfig } from "../types";

// Shared defaults used when a domain or path rule does not override them.
export const SITE_DEFAULTS: UnlockRulesConfig["defaults"] = {
  "allowed_strategies": [
    "fetch",
    "browser"
  ],
  "entry_strategy": "fetch",
  "fetch_timeout_ms": 8000,
  "browser_timeout_ms": 15000,
  "headers": {
    "referer": "https://www.google.com/",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "cross-site",
    "sec-fetch-user": "?1",
    "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "upgrade-insecure-requests": "1"
  }
};
