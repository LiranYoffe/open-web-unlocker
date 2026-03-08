import type { UnlockDomainConfig } from "../../types";

// Build, test, packaging, and general tooling documentation.
export const DEVELOPER_TOOLING_DOMAINS: Record<string, UnlockDomainConfig> = {
  "pkgx.sh": {
    "rules": [
      {
        "id": "pkgx-sh-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-pkgx-sh"
      }
    ]
  },
  "pkgx.dev": {
    "rules": [
      {
        "id": "pkgx-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-pkgx-dev"
      }
    ]
  },
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
        "parser": "docs-site-webpack-js-org"
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
        "parser": "docs-vitepress-vitejs-dev"
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
        "parser": "docs-site-babeljs-io"
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
        "parser": "docs-docusaurus-jestjs-io"
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
        "parser": "docs-vitepress-vitest-dev"
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
        "parser": "docs-docusaurus-docs-cypress-io"
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
        "parser": "docs-site-playwright-dev"
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
        "parser": "docs-site-eslint-org"
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
        "parser": "docs-site-prettier-io"
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
        "parser": "docs-docusaurus-biomejs-dev"
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
        "parser": "docs-mkdocs-docs-pnpm-io"
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
        "parser": "docs-site-yarnpkg-com"
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
        "parser": "docs-site-bun-sh"
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
        "parser": "docs-site-man7-org"
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
        "parser": "docs-site-devdocs-io"
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
        "parser": "docs-sphinx-docs-readthedocs-io"
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
        "parser": "docs-site-docs-gitbook-com"
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
        "parser": "docs-site-git-scm-com"
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
        "parser": "docs-site-git-scm-com"
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
        "parser": "docs-docusaurus-storybook-js-org"
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
        "parser": "docs-vitepress-vitepress-dev"
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
        "parser": "docs-docusaurus-docusaurus-io"
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
        "parser": "docs-site-turbo-build"
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
        "parser": "docs-mkdocs-pnpm-io"
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
        "parser": "docs-sphinx-docs-pytest-org"
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
        "parser": "docs-site-esbuild-github-io"
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
        "parser": "docs-docusaurus-testing-library-com"
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
        "parser": "docs-vitepress-rollupjs-org"
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
        "parser": "docs-vitepress-rspack-dev"
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
        "parser": "docs-docusaurus-pptr-dev"
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
        "parser": "docs-sphinx-docs-readthedocs-com"
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
        "parser": "docs-sphinx-docs-readthedocs-com"
      }
    ]
  }
};
