import type { UnlockDomainConfig } from "../../types";

// Generic-browser domains without dedicated parser families yet.
export const GENERAL_DOMAINS: Record<string, UnlockDomainConfig> = {
  "pinterest.com": {
    "rules": [
      {
        "id": "pinterest-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-pinterest-com"
      }
    ]
  },
  "chatgpt.com": {
    "rules": [
      {
        "id": "chatgpt-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-chatgpt-com"
      }
    ]
  },
  "netflix.com": {
    "rules": [
      {
        "id": "netflix-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-netflix-com"
      }
    ]
  },
  "temu.com": {
    "rules": [
      {
        "id": "temu-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-temu-com"
      }
    ]
  },
  "live.com": {
    "rules": [
      {
        "id": "live-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-live-com"
      }
    ]
  },
  "office.com": {
    "rules": [
      {
        "id": "office-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-office-com"
      }
    ]
  },
  "bilibili.com": {
    "rules": [
      {
        "id": "bilibili-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-bilibili-com"
      }
    ]
  },
  "twitch.tv": {
    "rules": [
      {
        "id": "twitch-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-twitch-tv"
      }
    ]
  },
  "canva.com": {
    "rules": [
      {
        "id": "canva-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-canva-com"
      }
    ]
  },
  "aliexpress.com": {
    "rules": [
      {
        "id": "aliexpress-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-aliexpress-com"
      }
    ]
  },
  "roblox.com": {
    "rules": [
      {
        "id": "roblox-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-roblox-com"
      }
    ]
  },
  "discord.com": {
    "rules": [
      {
        "id": "discord-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-discord-com"
      }
    ]
  },
  "spotify.com": {
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
        "parser": "spotify"
      }
    ]
  },
  "paypal.com": {
    "rules": [
      {
        "id": "paypal-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-paypal-com"
      }
    ]
  },
  "hbomax.com": {
    "rules": [
      {
        "id": "hbomax-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-hbomax-com"
      }
    ]
  },
  "instructure.com": {
    "rules": [
      {
        "id": "instructure-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-instructure-com"
      }
    ]
  },
  "rutube.ru": {
    "rules": [
      {
        "id": "rutube-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-rutube-ru"
      }
    ]
  },
  "disneyplus.com": {
    "rules": [
      {
        "id": "disneyplus-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-disneyplus-com"
      }
    ]
  },
  "office365.com": {
    "rules": [
      {
        "id": "office365-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-office365-com"
      }
    ]
  },
  "douyin.com": {
    "rules": [
      {
        "id": "douyin-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-douyin-com"
      }
    ]
  },
  "shein.com": {
    "rules": [
      {
        "id": "shein-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-shein-com"
      }
    ]
  },
  "grok.com": {
    "rules": [
      {
        "id": "grok-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-grok-com"
      }
    ]
  },
  "dzen.ru": {
    "rules": [
      {
        "id": "dzen-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-dzen-ru"
      }
    ]
  },
  "mail.ru": {
    "rules": [
      {
        "id": "mail-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-mail-ru"
      }
    ]
  },
  "vk.com": {
    "rules": [
      {
        "id": "vk-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "generic-vk-com"
      }
    ]
  },
  "microsoft.com": {
    "rules": [
      {
        "id": "ms-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "generic-microsoft-com"
      }
    ]
  },
  "stackoverflow.com": {
    "rules": [
      {
        "id": "so-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "stackoverflow"
      }
    ]
  },
  "cockroachlabs.com": {
    "rules": [
      {
        "id": "cockroachlabs-com-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-cockroachlabs-com"
      }
    ]
  }
};
