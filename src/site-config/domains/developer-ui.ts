import type { UnlockDomainConfig } from "../../types";

// UI, design-system, and frontend utility documentation.
export const DEVELOPER_UI_DOMAINS: Record<string, UnlockDomainConfig> = {
  "tailwindcss.com": {
    "rules": [
      {
        "id": "tw-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-tailwindcss-com"
      }
    ]
  },
  "getbootstrap.com": {
    "rules": [
      {
        "id": "bs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-getbootstrap-com"
      }
    ]
  },
  "mui.com": {
    "rules": [
      {
        "id": "mui-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-mui-com"
      }
    ]
  },
  "ui.shadcn.com": {
    "rules": [
      {
        "id": "shadcn-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-ui-shadcn-com"
      }
    ]
  },
  "radix-ui.com": {
    "rules": [
      {
        "id": "radix-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-radix-ui-com"
      }
    ]
  },
  "chakra-ui.com": {
    "rules": [
      {
        "id": "chakra-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-chakra-ui-com"
      }
    ]
  },
  "api.jquery.com": {
    "rules": [
      {
        "id": "jquery-api-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-api-jquery-com"
      }
    ]
  },
  "threejs.org": {
    "rules": [
      {
        "id": "threejs-docs",
        "match": {
          "type": "prefix",
          "value": "/docs/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-threejs-org"
      },
      {
        "id": "threejs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-threejs-org"
      }
    ]
  }
};
