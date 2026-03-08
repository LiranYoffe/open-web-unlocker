import type { UnlockDomainConfig } from "../../types";

// Amazon regional domains and Amazon-specific routes.
export const COMMERCE_AMAZON_DOMAINS: Record<string, UnlockDomainConfig> = {
  "amazon.com": {
    "rules": [
      {
        "id": "amz-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.com/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amz-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.com/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amz-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.com/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amz-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.com/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amz-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amz-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amz-default",
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
  "amazon.in": {
    "rules": [
      {
        "id": "amzin-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.in/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzin-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.in/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzin-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.in/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzin-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.in/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzin-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.in/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzin-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.in/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzin-default",
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
  "amazon.co.jp": {
    "rules": [
      {
        "id": "amzjp-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.co.jp/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzjp-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.co.jp/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzjp-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.co.jp/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzjp-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.co.jp/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzjp-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.co.jp/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzjp-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.co.jp/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzjp-default",
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
  "amazon.de": {
    "rules": [
      {
        "id": "amzde-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.de/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzde-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.de/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzde-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.de/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzde-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.de/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzde-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.de/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzde-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.de/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzde-default",
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
  "amazon.co.uk": {
    "rules": [
      {
        "id": "amzuk-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.co.uk/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzuk-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.co.uk/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzuk-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.co.uk/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzuk-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.co.uk/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzuk-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.co.uk/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzuk-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.co.uk/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzuk-default",
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
  "amazon.fr": {
    "rules": [
      {
        "id": "amzfr-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.fr/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzfr-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.fr/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzfr-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.fr/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzfr-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.fr/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzfr-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.fr/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzfr-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.fr/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzfr-default",
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
  "amazon.ca": {
    "rules": [
      {
        "id": "amzca-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.ca/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzca-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.ca/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzca-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.ca/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzca-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.ca/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzca-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.ca/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzca-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.ca/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzca-default",
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
  "amazon.com.au": {
    "rules": [
      {
        "id": "amzau-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.com.au/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzau-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.com.au/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzau-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.com.au/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzau-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.com.au/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzau-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.au/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzau-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.au/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzau-default",
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
  "amazon.es": {
    "rules": [
      {
        "id": "amzes-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.es/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzes-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.es/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzes-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.es/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzes-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.es/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzes-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.es/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzes-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.es/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzes-default",
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
  "amazon.it": {
    "rules": [
      {
        "id": "amzit-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.it/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzit-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.it/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzit-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.it/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzit-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.it/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzit-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.it/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzit-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.it/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzit-default",
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
  "amazon.nl": {
    "rules": [
      {
        "id": "amznl-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.nl/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amznl-product-gp",
        "match": {
          "type": "prefix",
          "value": "/gp/product/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.nl/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amznl-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.nl/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amznl-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.nl/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amznl-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.nl/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amznl-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.nl/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amznl-default",
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
  "amazon.com.mx": {
    "rules": [
      {
        "id": "amzmx-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.com.mx/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzmx-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.com.mx/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzmx-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.com.mx/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzmx-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.mx/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzmx-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.mx/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzmx-default",
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
  "amazon.com.br": {
    "rules": [
      {
        "id": "amzbr-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.com.br/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzbr-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.com.br/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzbr-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.com.br/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzbr-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.br/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzbr-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.br/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzbr-default",
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
  "amazon.com.sg": {
    "rules": [
      {
        "id": "amzsg-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.com.sg/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsg-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.com.sg/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsg-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.com.sg/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsg-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.sg/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsg-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.com.sg/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsg-default",
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
  "amazon.ae": {
    "rules": [
      {
        "id": "amzae-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.ae/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzae-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.ae/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzae-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.ae/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzae-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.ae/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzae-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.ae/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzae-default",
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
  "amazon.sa": {
    "rules": [
      {
        "id": "amzsa-product-dp",
        "match": {
          "type": "prefix",
          "value": "/dp/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon",
        "headers": {
          "referer": "https://www.amazon.sa/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsa-seller",
        "match": {
          "type": "prefix",
          "value": "/sp"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-sellers",
        "headers": {
          "referer": "https://www.amazon.sa/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsa-browse",
        "match": {
          "type": "regex",
          "value": "(^|/)b(?:/|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-browse",
        "headers": {
          "referer": "https://www.amazon.sa/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsa-lists",
        "match": {
          "type": "regex",
          "value": "(^/gp/(bestsellers|new-releases|movers-and-shakers)([/?]|$))|(/zgbs/)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.sa/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsa-search",
        "match": {
          "type": "regex",
          "value": "^/s([?/]|$)"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "amazon-search",
        "headers": {
          "referer": "https://www.amazon.sa/",
          "sec-fetch-site": "same-origin"
        }
      },
      {
        "id": "amzsa-default",
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
  }
};
