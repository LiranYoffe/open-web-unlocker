import type { UnlockDomainConfig } from "../../types";

// Social, community, and code-hosting domains.
export const SOCIAL_DOMAINS: Record<string, UnlockDomainConfig> = {
  "github.com": {
    "rules": [
      {
        "id": "gh-issues",
        "match": {
          "type": "regex",
          "value": "^/[\\w.-]+/[\\w.-]+/issues/\\d+$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "github"
      },
      {
        "id": "gh-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "github"
      }
    ]
  },
  "youtube.com": {
    "rules": [
      {
        "id": "yt-search",
        "match": {
          "type": "regex",
          "value": "^/(results|hashtag/[^/]+|feed/(explore|trending))"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "youtube"
      },
      {
        "id": "yt-watch",
        "match": {
          "type": "prefix",
          "value": "/watch"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "youtube"
      },
      {
        "id": "yt-channel-handle",
        "match": {
          "type": "prefix",
          "value": "/@"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "youtube"
      },
      {
        "id": "yt-channel",
        "match": {
          "type": "prefix",
          "value": "/channel/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "youtube"
      },
      {
        "id": "yt-channel-custom",
        "match": {
          "type": "regex",
          "value": "^/(c|user)/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "youtube"
      },
      {
        "id": "yt-default",
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
  "music.youtube.com": {
    "rules": [
      {
        "id": "ytmusic-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "youtube"
      }
    ]
  },
  "x.com": {
    "rules": [
      {
        "id": "x-with-replies-unsupported",
        "match": {
          "type": "regex",
          "value": "^/[^/]+/with_replies/?$"
        },
        "unsupported_reason": "X profile collection routes like /with_replies are not supported."
      },
      {
        "id": "x-tweet",
        "match": {
          "type": "regex",
          "value": "^/[^/]+/status/\\d+"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 15000,
        "parser": "twitter"
      },
      {
        "id": "x-profile",
        "match": {
          "type": "regex",
          "value": "^/[^/]+$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 30000,
        "parser": "twitter"
      },
      {
        "id": "x-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 30000,
        "parser": "twitter"
      }
    ]
  },
  "linkedin.com": {
    "rules": [
      {
        "id": "li-profile",
        "match": {
          "type": "prefix",
          "value": "/in/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "linkedin"
      },
      {
        "id": "li-feed-post",
        "match": {
          "type": "prefix",
          "value": "/feed/update/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "linkedin"
      },
      {
        "id": "li-post",
        "match": {
          "type": "prefix",
          "value": "/posts/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "linkedin"
      },
      {
        "id": "li-job",
        "match": {
          "type": "prefix",
          "value": "/jobs/view/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "linkedin"
      },
      {
        "id": "li-company",
        "match": {
          "type": "prefix",
          "value": "/company/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "linkedin"
      },
      {
        "id": "li-default",
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
  "facebook.com": {
    "rules": [
      {
        "id": "fb-marketplace-search",
        "match": {
          "type": "regex",
          "value": "^/marketplace(?:/[^/]+)?/search/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-marketplace-item",
        "match": {
          "type": "regex",
          "value": "^/marketplace/item/\\d+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-event",
        "match": {
          "type": "regex",
          "value": "^/events(?:/s/[^/]+)?/\\d+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-group-post",
        "match": {
          "type": "regex",
          "value": "^/groups/[^/]+/posts/\\d+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-group-page",
        "match": {
          "type": "regex",
          "value": "^/groups/[^/]+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-reviews",
        "match": {
          "type": "regex",
          "value": "^/[^/]+/reviews/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-post",
        "match": {
          "type": "regex",
          "value": "^/(reel|watch)/|^/(permalink\\.php|photo\\.php)$|^/[^/]+/(posts|videos)/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-page",
        "match": {
          "type": "regex",
          "value": "^/[^/]+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "facebook"
      },
      {
        "id": "fb-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic"
      }
    ]
  },
  "instagram.com": {
    "rules": [
      {
        "id": "ig-post",
        "match": {
          "type": "regex",
          "value": "^/(?:[^/]+/)?(p|reel)/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "instagram"
      },
      {
        "id": "ig-profile",
        "match": {
          "type": "regex",
          "value": "^/(?!accounts/|explore/|stories/|developer/|about/|legal/|web/|reel/|p/)[^/]+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "instagram"
      },
      {
        "id": "ig-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic"
      }
    ]
  },
  "tiktok.com": {
    "rules": [
      {
        "id": "tiktok-video",
        "match": {
          "type": "regex",
          "value": "^/@[^/]+/video/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "tiktok"
      },
      {
        "id": "tiktok-profile",
        "match": {
          "type": "regex",
          "value": "^/@[^/]+/?$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "tiktok"
      },
      {
        "id": "tiktok-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic"
      }
    ]
  },
  "quora.com": {
    "rules": [
      {
        "id": "quora-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "quora"
      }
    ]
  },
  "reddit.com": {
    "rules": [
      {
        "id": "reddit-post",
        "match": {
          "type": "regex",
          "value": "^/r/[^/]+/comments/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "reddit"
      },
      {
        "id": "reddit-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "reddit"
      }
    ]
  },
  "old.reddit.com": {
    "rules": [
      {
        "id": "oldreddit-post",
        "match": {
          "type": "regex",
          "value": "^/r/[^/]+/comments/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "reddit"
      },
      {
        "id": "oldreddit-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "reddit"
      }
    ]
  },
  "news.ycombinator.com": {
    "rules": [
      {
        "id": "hn-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch"
        ],
        "entry_strategy": "fetch",
        "parser": "hackernews"
      }
    ]
  },
  "gitlab.com": {
    "rules": [
      {
        "id": "gitlab-issue",
        "match": {
          "type": "regex",
          "value": "^/[^/]+/[^/]+/-/issues/\\d+$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "gitlab"
      },
      {
        "id": "gitlab-mr",
        "match": {
          "type": "regex",
          "value": "^/[^/]+/[^/]+/-/merge_requests/\\d+$"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "gitlab"
      },
      {
        "id": "gitlab-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "gitlab"
      }
    ]
  },
  "vimeo.com": {
    "rules": [
      {
        "id": "vimeo-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "browser_timeout_ms": 20000,
        "parser": "vimeo"
      }
    ]
  },
  "producthunt.com": {
    "rules": [
      {
        "id": "producthunt-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "producthunt"
      }
    ]
  },
  "gist.github.com": {
    "rules": [
      {
        "id": "gist-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "github"
      }
    ]
  }
};
