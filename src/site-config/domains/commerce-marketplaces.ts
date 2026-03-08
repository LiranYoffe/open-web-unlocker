import type { UnlockDomainConfig } from "../../types";

// Retail, marketplace, and merchant domains.
export const COMMERCE_MARKETPLACES_DOMAINS: Record<string, UnlockDomainConfig> = {
  "ebay.com": {
    "rules": [
      {
        "id": "ebay-listing",
        "match": {
          "type": "prefix",
          "value": "/itm/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "ebay"
      },
      {
        "id": "ebay-search",
        "match": {
          "type": "prefix",
          "value": "/sch/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "ebay"
      },
      {
        "id": "ebay-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-ebay-com"
      }
    ]
  },
  "walmart.com": {
    "rules": [
      {
        "id": "walmart-product",
        "match": {
          "type": "prefix",
          "value": "/ip/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "walmart"
      },
      {
        "id": "walmart-seller",
        "match": {
          "type": "regex",
          "value": "^/(?:global/)?seller/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "walmart-sellers"
      },
      {
        "id": "walmart-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "walmart"
      },
      {
        "id": "walmart-browse",
        "match": {
          "type": "prefix",
          "value": "/browse/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "walmart"
      },
      {
        "id": "walmart-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-walmart-com"
      }
    ]
  },
  "target.com": {
    "rules": [
      {
        "id": "target-product",
        "match": {
          "type": "prefix",
          "value": "/p/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "target"
      },
      {
        "id": "target-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-target-com"
      }
    ]
  },
  "etsy.com": {
    "rules": [
      {
        "id": "etsy-listing",
        "match": {
          "type": "regex",
          "value": "^/listing/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "etsy"
      },
      {
        "id": "etsy-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-etsy-com"
      }
    ]
  }
};
