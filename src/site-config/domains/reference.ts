import type { UnlockDomainConfig } from "../../types";

// Reference, research, news, and article-heavy domains.
export const REFERENCE_DOMAINS: Record<string, UnlockDomainConfig> = {
  "bbc.com": {
    "rules": [
      {
        "id": "bbc-news",
        "match": {
          "type": "prefix",
          "value": "/news/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      },
      {
        "id": "bbc-sport",
        "match": {
          "type": "prefix",
          "value": "/sport/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      },
      {
        "id": "bbc-default",
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
  "bbc.co.uk": {
    "rules": [
      {
        "id": "bbcuk-news",
        "match": {
          "type": "prefix",
          "value": "/news/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      },
      {
        "id": "bbcuk-sport",
        "match": {
          "type": "prefix",
          "value": "/sport/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      },
      {
        "id": "bbcuk-default",
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
  "msn.com": {
    "rules": [
      {
        "id": "msn-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "globo.com": {
    "rules": [
      {
        "id": "globo-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "cricbuzz.com": {
    "rules": [
      {
        "id": "cricbuzz-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "arxiv.org": {
    "rules": [
      {
        "id": "arxiv-abstract",
        "match": {
          "type": "prefix",
          "value": "/abs/"
        },
        "allowed_strategies": [
          "fetch"
        ],
        "entry_strategy": "fetch",
        "parser": "arxiv"
      },
      {
        "id": "arxiv-pdf",
        "match": {
          "type": "prefix",
          "value": "/pdf/"
        },
        "allowed_strategies": [
          "fetch"
        ],
        "entry_strategy": "fetch",
        "parser": "generic"
      },
      {
        "id": "arxiv-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch"
        ],
        "entry_strategy": "fetch",
        "parser": "generic"
      }
    ]
  },
  "reuters.com": {
    "rules": [
      {
        "id": "reuters-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "apnews.com": {
    "rules": [
      {
        "id": "apnews-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "bloomberg.com": {
    "rules": [
      {
        "id": "bloomberg-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "washingtonpost.com": {
    "rules": [
      {
        "id": "wapo-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "ft.com": {
    "rules": [
      {
        "id": "ft-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "economist.com": {
    "rules": [
      {
        "id": "economist-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "forbes.com": {
    "rules": [
      {
        "id": "forbes-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "techcrunch.com": {
    "rules": [
      {
        "id": "tc-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "wired.com": {
    "rules": [
      {
        "id": "wired-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "arstechnica.com": {
    "rules": [
      {
        "id": "ars-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "theatlantic.com": {
    "rules": [
      {
        "id": "atlantic-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "politico.com": {
    "rules": [
      {
        "id": "politico-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "time.com": {
    "rules": [
      {
        "id": "time-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "usatoday.com": {
    "rules": [
      {
        "id": "usatoday-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "wsj.com": {
    "rules": [
      {
        "id": "wsj-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "independent.co.uk": {
    "rules": [
      {
        "id": "independent-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "dailymail.co.uk": {
    "rules": [
      {
        "id": "dailymail-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "thetimes.co.uk": {
    "rules": [
      {
        "id": "thetimes-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "lemonde.fr": {
    "rules": [
      {
        "id": "lemonde-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "spiegel.de": {
    "rules": [
      {
        "id": "spiegel-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "elpais.com": {
    "rules": [
      {
        "id": "elpais-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "medium.com": {
    "rules": [
      {
        "id": "medium-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "news-article"
      }
    ]
  },
  "dev.to": {
    "rules": [
      {
        "id": "devto-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "hashnode.com": {
    "rules": [
      {
        "id": "hashnode-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "substack.com": {
    "rules": [
      {
        "id": "substack-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "news-article"
      }
    ]
  },
  "pubmed.ncbi.nlm.nih.gov": {
    "rules": [
      {
        "id": "pubmed-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "pubmed"
      }
    ]
  },
  "semanticscholar.org": {
    "rules": [
      {
        "id": "s2-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 45000,
        "parser": "semantic-scholar"
      }
    ]
  },
  "en.wikiversity.org": {
    "rules": [
      {
        "id": "wikiversity-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "en.wikibooks.org": {
    "rules": [
      {
        "id": "wikibooks-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "en.wikisource.org": {
    "rules": [
      {
        "id": "wikisource-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "fr.wikipedia.org": {
    "rules": [
      {
        "id": "wp-fr-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "de.wikipedia.org": {
    "rules": [
      {
        "id": "wp-de-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "es.wikipedia.org": {
    "rules": [
      {
        "id": "wp-es-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "ja.wikipedia.org": {
    "rules": [
      {
        "id": "wp-ja-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "pt.wikipedia.org": {
    "rules": [
      {
        "id": "wp-pt-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "ru.wikipedia.org": {
    "rules": [
      {
        "id": "wp-ru-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "it.wikipedia.org": {
    "rules": [
      {
        "id": "wp-it-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  },
  "zh.wikipedia.org": {
    "rules": [
      {
        "id": "wp-zh-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "wikipedia"
      }
    ]
  }
};
