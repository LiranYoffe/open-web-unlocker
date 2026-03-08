import type { UnlockDomainConfig } from "../../types";

// Package registry and package index domains.
export const REGISTRIES_DOMAINS: Record<string, UnlockDomainConfig> = {
  "hackage.haskell.org": {
    "rules": [
      {
        "id": "hackage-search",
        "match": {
          "type": "prefix",
          "value": "/packages/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 25000,
        "browser_actions": [
          {
            "type": "wait_for_selector",
            "selector": "#listing tr",
            "state": "visible",
            "timeout_ms": 12000
          }
        ],
        "parser": "hackage"
      },
      {
        "id": "hackage-package",
        "match": {
          "type": "prefix",
          "value": "/package/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "hackage"
      },
      {
        "id": "hackage-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-hackage-haskell-org"
      }
    ]
  },
  "npmjs.com": {
    "rules": [
      {
        "id": "npm-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "npm"
      },
      {
        "id": "npm-package",
        "match": {
          "type": "prefix",
          "value": "/package/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "npm"
      },
      {
        "id": "npm-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-npmjs-com"
      }
    ]
  },
  "pypi.org": {
    "rules": [
      {
        "id": "pypi-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "pypi"
      },
      {
        "id": "pypi-package",
        "match": {
          "type": "prefix",
          "value": "/project/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "pypi"
      },
      {
        "id": "pypi-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-pypi-org"
      }
    ]
  },
  "crates.io": {
    "rules": [
      {
        "id": "crates-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 30000,
        "browser_retries": 2,
        "parser": "crates",
        "browser_actions": [
          {
            "type": "wait_for_selector",
            "selector": "a[href^=\"/crates/\"]",
            "state": "visible",
            "timeout_ms": 12000
          }
        ]
      },
      {
        "id": "crates-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 20000,
        "parser": "crates"
      }
    ]
  },
  "rubygems.org": {
    "rules": [
      {
        "id": "rubygems-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "rubygems"
      }
    ]
  },
  "packagist.org": {
    "rules": [
      {
        "id": "packagist-explore",
        "match": {
          "type": "prefix",
          "value": "/explore"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "packagist"
      },
      {
        "id": "packagist-search",
        "match": {
          "type": "regex",
          "value": "^/search/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 25000,
        "browser_actions": [
          {
            "type": "wait_for_selector",
            "selector": "#search-container:not(.hidden) .search-list .package-item",
            "state": "visible",
            "timeout_ms": 12000
          }
        ],
        "parser": "packagist"
      },
      {
        "id": "packagist-package",
        "match": {
          "type": "regex",
          "value": "^/packages/[^/]+/[^/]+/?$"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "packagist"
      },
      {
        "id": "packagist-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-packagist-org"
      }
    ]
  },
  "nuget.org": {
    "rules": [
      {
        "id": "nuget-packages",
        "match": {
          "type": "prefix",
          "value": "/packages"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "nuget"
      },
      {
        "id": "nuget-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-nuget-org"
      }
    ]
  },
  "pub.dev": {
    "rules": [
      {
        "id": "pubdev-packages",
        "match": {
          "type": "prefix",
          "value": "/packages"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "pubdev"
      },
      {
        "id": "pubdev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-pub-dev"
      }
    ]
  },
  "cocoapods.org": {
    "rules": [
      {
        "id": "cocoapods-pod",
        "match": {
          "type": "prefix",
          "value": "/pods/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "cocoapods"
      },
      {
        "id": "cocoapods-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-cocoapods-org"
      }
    ]
  },
  "jsr.io": {
    "rules": [
      {
        "id": "jsr-search",
        "match": {
          "type": "exact",
          "value": "/packages"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "jsr"
      },
      {
        "id": "jsr-package",
        "match": {
          "type": "regex",
          "value": "^/@[^/]+/[^/]+/?$"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "jsr"
      },
      {
        "id": "jsr-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-jsr-io"
      }
    ]
  },
  "swiftpackageindex.com": {
    "rules": [
      {
        "id": "swift-package-index-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "swift-package-index"
      },
      {
        "id": "swift-package-index-package",
        "match": {
          "type": "regex",
          "value": "^/(?!search(?:/|$)|faq(?:/|$)|blog(?:/|$)|supporters(?:/|$)|keywords(?:/|$)|privacy(?:/|$)|build-monitor(?:/|$)|ready-for-swift-6(?:/|$)|add-a-package(?:/|$)|package-collections(?:/|$)|docs(?:/|$))[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "swift-package-index"
      },
      {
        "id": "swift-package-index-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-swiftpackageindex-com"
      }
    ]
  },
  "hex.pm": {
    "rules": [
      {
        "id": "hex-packages",
        "match": {
          "type": "prefix",
          "value": "/packages"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "hex"
      },
      {
        "id": "hex-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-hex-pm"
      }
    ]
  },
  "metacpan.org": {
    "rules": [
      {
        "id": "metacpan-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 20000,
        "parser": "metacpan"
      },
      {
        "id": "metacpan-pod",
        "match": {
          "type": "prefix",
          "value": "/pod/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "metacpan"
      },
      {
        "id": "metacpan-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-metacpan-org"
      }
    ]
  },
  "central.sonatype.com": {
    "rules": [
      {
        "id": "maven-central-search",
        "match": {
          "type": "prefix",
          "value": "/search"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 30000,
        "browser_actions": [
          {
            "type": "wait_for_selector",
            "selector": "[data-test=\"component-card-item\"]",
            "state": "visible",
            "timeout_ms": 12000
          }
        ],
        "parser": "maven-central"
      },
      {
        "id": "maven-central-artifact",
        "match": {
          "type": "prefix",
          "value": "/artifact/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "maven-central"
      },
      {
        "id": "maven-central-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-central-sonatype-com"
      }
    ]
  },
  "hub.docker.com": {
    "rules": [
      {
        "id": "docker-hub-search",
        "match": {
          "type": "regex",
          "value": "^/(search|hardened-images/catalog)(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docker-hub"
      },
      {
        "id": "docker-hub-image",
        "match": {
          "type": "regex",
          "value": "^/(r/[^/]+/[^/]+|_/[^/]+)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docker-hub"
      },
      {
        "id": "docker-hub-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-hub-docker-com"
      }
    ]
  }
};
