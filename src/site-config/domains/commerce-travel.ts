import type { UnlockDomainConfig } from "../../types";

// Travel, listings, local-business, and review domains.
export const COMMERCE_TRAVEL_DOMAINS: Record<string, UnlockDomainConfig> = {
  "booking.com": {
    "rules": [
      {
        "id": "booking-search",
        "match": {
          "type": "prefix",
          "value": "/searchresults"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "booking-search"
      },
      {
        "id": "booking-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "booking"
      }
    ]
  },
  "airbnb.com": {
    "rules": [
      {
        "id": "airbnb-listing",
        "match": {
          "type": "prefix",
          "value": "/rooms/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 30000,
        "parser": "airbnb"
      },
      {
        "id": "airbnb-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-airbnb-com"
      }
    ]
  },
  "yelp.com": {
    "defaults": {
      "headers": {
        "referer": "https://www.google.com/"
      },
      "browser_retries": 2
    },
    "rules": [
      {
        "id": "yelp-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "yelp"
      },
      {
        "id": "yelp-biz",
        "match": {
          "type": "prefix",
          "value": "/biz/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "yelp"
      },
      {
        "id": "yelp-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-yelp-com"
      }
    ]
  },
  "tripadvisor.com": {
    "rules": [
      {
        "id": "tripadvisor-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "browser_timeout_ms": 30000,
        "parser": "tripadvisor"
      }
    ]
  },
  "zillow.com": {
    "rules": [
      {
        "id": "zillow-property",
        "match": {
          "type": "regex",
          "value": "^/homedetails/|_zpid/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 20000,
        "parser": "zillow"
      },
      {
        "id": "zillow-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 20000,
        "parser": "generic-zillow-com"
      }
    ]
  },
  "trustpilot.com": {
    "rules": [
      {
        "id": "trustpilot-default",
        "match": {
          "type": "prefix",
          "value": "/review/"
        },
        "allowed_strategies": [
          "fetch"
        ],
        "entry_strategy": "fetch",
        "parser": "trustpilot"
      }
    ]
  }
};
