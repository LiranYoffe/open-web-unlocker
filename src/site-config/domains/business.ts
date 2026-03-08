import type { UnlockDomainConfig } from "../../types";

// Business, recruiting, and finance domains.
export const BUSINESS_DOMAINS: Record<string, UnlockDomainConfig> = {
  "finance.yahoo.com": {
    "defaults": {
      "allowed_strategies": [
        "browser"
      ],
      "entry_strategy": "browser",
      "browser_actions": [
        {
          "type": "click",
          "selector": "button[name=\"reject\"]",
          "optional": true,
          "wait_until": "domcontentloaded",
          "post_wait_ms": 500
        },
        {
          "type": "wait_for_load_state",
          "state": "networkidle",
          "timeout_ms": 5000,
          "optional": true
        }
      ]
    },
    "rules": [
      {
        "id": "yahoo-finance-search",
        "match": {
          "type": "prefix",
          "value": "/lookup"
        },
        "parser": "yahoo-finance"
      },
      {
        "id": "yahoo-finance-quote",
        "match": {
          "type": "prefix",
          "value": "/quote/"
        },
        "parser": "yahoo-finance"
      },
      {
        "id": "yahoo-finance-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "parser": "generic"
      }
    ]
  },
  "wellfound.com": {
    "rules": [
      {
        "id": "wellfound-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wellfound"
      }
    ]
  },
  "indeed.com": {
    "rules": [
      {
        "id": "indeed-company",
        "match": {
          "type": "prefix",
          "value": "/cmp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "indeed"
      },
      {
        "id": "indeed-job",
        "match": {
          "type": "prefix",
          "value": "/viewjob"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "indeed"
      },
      {
        "id": "indeed-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic"
      }
    ]
  },
  "glassdoor.com": {
    "defaults": {
      "allowed_strategies": [
        "fetch",
        "browser"
      ],
      "entry_strategy": "fetch",
      "browser_timeout_ms": 22000,
      "browser_retries": 2,
      "headers": {
        "referer": "https://www.google.com/"
      },
      "browser_actions": [
        {
          "type": "wait_for_timeout",
          "duration_ms": 2500,
          "optional": true
        },
        {
          "type": "click",
          "selector": ".main-content",
          "optional": true,
          "timeout_ms": 8000,
          "wait_until": "none",
          "post_wait_ms": 1000,
          "position": {
            "x": 20,
            "y": 35
          }
        },
        {
          "type": "wait_for_load_state",
          "state": "networkidle",
          "optional": true,
          "timeout_ms": 8000
        }
      ]
    },
    "rules": [
      {
        "id": "glassdoor-reviews",
        "match": {
          "type": "prefix",
          "value": "/Reviews/"
        },
        "parser": "glassdoor-reviews"
      },
      {
        "id": "glassdoor-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "parser": "glassdoor"
      }
    ]
  },
  "crunchbase.com": {
    "defaults": {
      "allowed_strategies": [
        "browser"
      ],
      "entry_strategy": "browser",
      "browser_timeout_ms": 30000,
      "browser_retries": 2,
      "headers": {
        "referer": "https://www.google.com/"
      },
      "browser_actions": [
        {
          "type": "wait_for_timeout",
          "duration_ms": 5000,
          "optional": true
        },
        {
          "type": "wait_for_selector",
          "selector": "iframe[src*=\"challenges.cloudflare.com\"]",
          "optional": true,
          "timeout_ms": 10000,
          "state": "attached"
        },
        {
          "type": "click",
          "selector": "body",
          "frame_url_contains": "challenges.cloudflare.com",
          "optional": true,
          "timeout_ms": 8000,
          "wait_until": "none",
          "post_wait_ms": 6000,
          "position": {
            "x": 30,
            "y": 30
          }
        },
        {
          "type": "wait_for_load_state",
          "state": "networkidle",
          "optional": true,
          "timeout_ms": 10000
        }
      ]
    },
    "rules": [
      {
        "id": "crunchbase-discover",
        "match": {
          "type": "prefix",
          "value": "/discover/"
        },
        "parser": "crunchbase"
      },
      {
        "id": "crunchbase-search",
        "match": {
          "type": "prefix",
          "value": "/search/organizations/"
        },
        "parser": "crunchbase"
      },
      {
        "id": "crunchbase-company",
        "match": {
          "type": "prefix",
          "value": "/organization/"
        },
        "parser": "crunchbase"
      },
      {
        "id": "crunchbase-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "parser": "generic"
      }
    ]
  }
};
