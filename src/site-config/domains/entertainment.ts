import type { UnlockDomainConfig } from "../../types";

// Entertainment, app-store, and culture domains.
export const ENTERTAINMENT_DOMAINS: Record<string, UnlockDomainConfig> = {
  "imdb.com": {
    "rules": [
      {
        "id": "imdb-title",
        "match": {
          "type": "prefix",
          "value": "/title/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "imdb"
      },
      {
        "id": "imdb-name",
        "match": {
          "type": "prefix",
          "value": "/name/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "imdb"
      },
      {
        "id": "imdb-default",
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
  "rottentomatoes.com": {
    "rules": [
      {
        "id": "rt-movie",
        "match": {
          "type": "prefix",
          "value": "/m/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "rottentomatoes"
      },
      {
        "id": "rt-tv",
        "match": {
          "type": "prefix",
          "value": "/tv/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "rottentomatoes"
      },
      {
        "id": "rt-default",
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
  "metacritic.com": {
    "rules": [
      {
        "id": "mc-movie",
        "match": {
          "type": "prefix",
          "value": "/movie/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "metacritic"
      },
      {
        "id": "mc-tv",
        "match": {
          "type": "prefix",
          "value": "/tv/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "metacritic"
      },
      {
        "id": "mc-default",
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
  "fandom.com": {
    "rules": [
      {
        "id": "fandom-wiki",
        "match": {
          "type": "prefix",
          "value": "/wiki/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "fandom"
      },
      {
        "id": "fandom-default",
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
  "goodreads.com": {
    "rules": [
      {
        "id": "goodreads-book",
        "match": {
          "type": "prefix",
          "value": "/book/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "goodreads"
      },
      {
        "id": "goodreads-default",
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
  "apps.apple.com": {
    "rules": [
      {
        "id": "appstore-app",
        "match": {
          "type": "regex",
          "value": "^/[a-z]{2}/app/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "appstore"
      },
      {
        "id": "appstore-default",
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
  "open.spotify.com": {
    "rules": [
      {
        "id": "spotify-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 15000,
        "parser": "spotify"
      }
    ]
  },
  "play.google.com": {
    "rules": [
      {
        "id": "playstore-default",
        "match": {
          "type": "prefix",
          "value": "/store/apps/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "playstore"
      }
    ]
  }
};
