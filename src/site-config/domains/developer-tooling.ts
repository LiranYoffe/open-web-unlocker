import type { UnlockDomainConfig } from "../../types";

// Build, test, packaging, and general tooling documentation.
export const DEVELOPER_TOOLING_DOMAINS: Record<string, UnlockDomainConfig> = {
  "webpack.js.org": {
    "rules": [
      {
        "id": "webpack-default",
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
  "vitejs.dev": {
    "rules": [
      {
        "id": "vite-default",
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
  "babeljs.io": {
    "rules": [
      {
        "id": "babel-default",
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
  "jestjs.io": {
    "rules": [
      {
        "id": "jest-default",
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
  "vitest.dev": {
    "rules": [
      {
        "id": "vitest-default",
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
  "docs.cypress.io": {
    "rules": [
      {
        "id": "cypress-default",
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
  "playwright.dev": {
    "rules": [
      {
        "id": "pw-default",
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
  "eslint.org": {
    "rules": [
      {
        "id": "eslint-default",
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
  "prettier.io": {
    "rules": [
      {
        "id": "prettier-default",
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
  "biomejs.dev": {
    "rules": [
      {
        "id": "biome-default",
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
  "docs.pnpm.io": {
    "rules": [
      {
        "id": "pnpm-default",
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
  "yarnpkg.com": {
    "rules": [
      {
        "id": "yarn-default",
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
  "bun.sh": {
    "rules": [
      {
        "id": "bun-default",
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
  "man7.org": {
    "rules": [
      {
        "id": "man7-default",
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
  "devdocs.io": {
    "rules": [
      {
        "id": "devdocs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "docs-site"
      }
    ]
  },
  "docs.readthedocs.io": {
    "rules": [
      {
        "id": "readthedocs-default",
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
  "docs.gitbook.com": {
    "rules": [
      {
        "id": "gitbook-default",
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
  "git-scm.com": {
    "rules": [
      {
        "id": "git-search",
        "match": {
          "type": "prefix",
          "value": "/search/results"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "docs-site"
      },
      {
        "id": "git-default",
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
  "storybook.js.org": {
    "rules": [
      {
        "id": "storybook-docs-default",
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
  "vitepress.dev": {
    "rules": [
      {
        "id": "vitepress-docs-default",
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
  "docusaurus.io": {
    "rules": [
      {
        "id": "docusaurus-docs-default",
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
  "turbo.build": {
    "rules": [
      {
        "id": "turbo-docs-default",
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
  "pnpm.io": {
    "rules": [
      {
        "id": "pnpm-docs-default",
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
  "docs.pytest.org": {
    "rules": [
      {
        "id": "pytest-docs-default",
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
  "esbuild.github.io": {
    "rules": [
      {
        "id": "esbuild-github-io-default",
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
  "testing-library.com": {
    "rules": [
      {
        "id": "testing-library-com-default",
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
  "rollupjs.org": {
    "rules": [
      {
        "id": "rollupjs-org-default",
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
  "rspack.dev": {
    "rules": [
      {
        "id": "rspack-dev-default",
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
  "pptr.dev": {
    "rules": [
      {
        "id": "pptr-dev-default",
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
  "docs.readthedocs.com": {
    "rules": [
      {
        "id": "readthedocs-com-search",
        "match": {
          "type": "regex",
          "value": "^/.+/search.html$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "docs-site"
      },
      {
        "id": "readthedocs-com-default",
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
