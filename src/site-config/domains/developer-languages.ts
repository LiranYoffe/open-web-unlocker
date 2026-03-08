import type { UnlockDomainConfig } from "../../types";

// Language runtimes and core language-reference documentation.
export const DEVELOPER_LANGUAGES_DOMAINS: Record<string, UnlockDomainConfig> = {
  "developer.mozilla.org": {
    "rules": [
      {
        "id": "mdn-search",
        "match": {
          "type": "regex",
          "value": "^/[A-Za-z-]+/search$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 20000,
        "include_shadow_dom": true,
        "browser_actions": [
          {
            "type": "wait_for_timeout",
            "duration_ms": 6000
          }
        ],
        "parser": "docs-site"
      },
      {
        "id": "mdn-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "docs.python.org": {
    "rules": [
      {
        "id": "py-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "nodejs.org": {
    "rules": [
      {
        "id": "node-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "typescriptlang.org": {
    "rules": [
      {
        "id": "ts-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "doc.rust-lang.org": {
    "rules": [
      {
        "id": "rust-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "docs.rs": {
    "rules": [
      {
        "id": "docsrs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "go.dev": {
    "rules": [
      {
        "id": "go-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "pkg.go.dev": {
    "rules": [
      {
        "id": "gopkg-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "kotlinlang.org": {
    "rules": [
      {
        "id": "kotlin-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "www.php.net": {
    "rules": [
      {
        "id": "php-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "ruby-doc.org": {
    "rules": [
      {
        "id": "ruby-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "cppreference.com": {
    "rules": [
      {
        "id": "cpp-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "docs.swift.org": {
    "rules": [
      {
        "id": "swift-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "elixir-lang.org": {
    "rules": [
      {
        "id": "elixir-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "docs.scala-lang.org": {
    "rules": [
      {
        "id": "scala-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "dlang.org": {
    "rules": [
      {
        "id": "dlang-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "crystal-lang.org": {
    "rules": [
      {
        "id": "crystal-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "www.haskell.org": {
    "rules": [
      {
        "id": "haskell-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "www.erlang.org": {
    "rules": [
      {
        "id": "erlang-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "www.lua.org": {
    "rules": [
      {
        "id": "lua-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "julialang.org": {
    "rules": [
      {
        "id": "julia-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "docs.julialang.org": {
    "rules": [
      {
        "id": "julialang-org-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "docs-site"
      }
    ]
  },
  "lua.org": {
    "rules": [
      {
        "id": "lua-org-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  }
};
