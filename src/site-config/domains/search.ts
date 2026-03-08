import type { UnlockDomainConfig } from "../../types";

// Search engine domains.
export const SEARCH_DOMAINS: Record<string, UnlockDomainConfig> = {
  "google.com": {
    "rules": [
      {
        "id": "google-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "google"
      },
      {
        "id": "google-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-google-com"
      }
    ]
  },
  "bing.com": {
    "rules": [
      {
        "id": "bing-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "bing"
      },
      {
        "id": "bing-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-bing-com"
      }
    ]
  },
  "duckduckgo.com": {
    "rules": [
      {
        "id": "ddg-search",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "duckduckgo"
      }
    ]
  },
  "search.brave.com": {
    "rules": [
      {
        "id": "brave-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "brave-search"
      },
      {
        "id": "brave-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-search-brave-com"
      }
    ]
  }
};
