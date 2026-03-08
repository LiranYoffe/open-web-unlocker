import type { UnlockDomainConfig } from "../../types";

// AI, data, API, and platform-integration documentation.
export const DEVELOPER_AI_DOMAINS: Record<string, UnlockDomainConfig> = {
  "developers.google.com": {
    "rules": [
      {
        "id": "gdev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-devsite-developers-google-com"
      }
    ]
  },
  "platform.openai.com": {
    "rules": [
      {
        "id": "oai-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-platform-openai-com"
      }
    ]
  },
  "docs.anthropic.com": {
    "rules": [
      {
        "id": "anthropic-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-docs-anthropic-com"
      }
    ]
  },
  "www.twilio.com": {
    "rules": [
      {
        "id": "twilio-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-www-twilio-com"
      }
    ]
  },
  "docs.expo.dev": {
    "rules": [
      {
        "id": "expo-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-docs-expo-dev"
      }
    ]
  },
  "reactnative.dev": {
    "rules": [
      {
        "id": "rn-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-reactnative-dev"
      }
    ]
  },
  "flutter.dev": {
    "rules": [
      {
        "id": "flutter-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-flutter-dev"
      }
    ]
  },
  "www.tensorflow.org": {
    "rules": [
      {
        "id": "tf-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-www-tensorflow-org"
      }
    ]
  },
  "pytorch.org": {
    "rules": [
      {
        "id": "pytorch-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-pytorch-org"
      }
    ]
  },
  "scikit-learn.org": {
    "rules": [
      {
        "id": "sklearn-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-scikit-learn-org"
      }
    ]
  },
  "pandas.pydata.org": {
    "rules": [
      {
        "id": "pandas-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-pandas-pydata-org"
      }
    ]
  },
  "numpy.org": {
    "rules": [
      {
        "id": "numpy-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-numpy-org"
      }
    ]
  },
  "matplotlib.org": {
    "rules": [
      {
        "id": "mpl-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-matplotlib-org"
      }
    ]
  },
  "huggingface.co": {
    "rules": [
      {
        "id": "hf-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-huggingface-co"
      }
    ]
  },
  "graphql.org": {
    "rules": [
      {
        "id": "graphql-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-graphql-org"
      }
    ]
  },
  "grpc.io": {
    "rules": [
      {
        "id": "grpc-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-grpc-io"
      }
    ]
  },
  "www.apollographql.com": {
    "rules": [
      {
        "id": "apollo-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-www-apollographql-com"
      }
    ]
  },
  "www.w3schools.com": {
    "rules": [
      {
        "id": "w3s-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-www-w3schools-com"
      }
    ]
  },
  "www.w3.org": {
    "rules": [
      {
        "id": "w3c-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-www-w3-org"
      }
    ]
  },
  "developer.android.com": {
    "rules": [
      {
        "id": "android-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-devsite-developer-android-com"
      }
    ]
  },
  "developer.apple.com": {
    "rules": [
      {
        "id": "apple-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-developer-apple-com"
      }
    ]
  },
  "developer.chrome.com": {
    "rules": [
      {
        "id": "chrome-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-devsite-developer-chrome-com"
      }
    ]
  },
  "web.dev": {
    "rules": [
      {
        "id": "webdev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-devsite-web-dev"
      }
    ]
  },
  "kafka.apache.org": {
    "rules": [
      {
        "id": "kafka-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-kafka-apache-org"
      }
    ]
  },
  "helm.sh": {
    "rules": [
      {
        "id": "helm-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-mkdocs-helm-sh"
      }
    ]
  },
  "docs.nestjs.com": {
    "rules": [
      {
        "id": "nestjs-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "browser"
        ],
        "entry_strategy": "browser",
        "parser": "docs-docusaurus-docs-nestjs-com"
      }
    ]
  },
  "fastify.dev": {
    "rules": [
      {
        "id": "fastify-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-fastify-dev"
      }
    ]
  },
  "socket.io": {
    "rules": [
      {
        "id": "socketio-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-socket-io"
      }
    ]
  },
  "electronjs.org": {
    "rules": [
      {
        "id": "electron-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-electronjs-org"
      }
    ]
  },
  "cookbook.openai.com": {
    "rules": [
      {
        "id": "openai-cookbook-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-cookbook-openai-com"
      }
    ]
  },
  "docs.langchain.com": {
    "rules": [
      {
        "id": "langchain-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-sphinx-docs-langchain-com"
      }
    ]
  },
  "python.langchain.com": {
    "rules": [
      {
        "id": "langchain-python-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-sphinx-python-langchain-com"
      }
    ]
  },
  "authjs.dev": {
    "rules": [
      {
        "id": "authjs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-authjs-dev"
      }
    ]
  },
  "axios-http.com": {
    "rules": [
      {
        "id": "axios-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-axios-http-com"
      }
    ]
  },
  "date-fns.org": {
    "rules": [
      {
        "id": "datefns-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-date-fns-org"
      }
    ]
  },
  "day.js.org": {
    "rules": [
      {
        "id": "dayjs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-day-js-org"
      }
    ]
  },
  "docs.expo.io": {
    "rules": [
      {
        "id": "expo-io-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-docs-expo-io"
      }
    ]
  },
  "docs.flutter.dev": {
    "rules": [
      {
        "id": "flutter-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-docs-flutter-dev"
      }
    ]
  },
  "api.flutter.dev": {
    "rules": [
      {
        "id": "flutter-api-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-api-flutter-dev"
      }
    ]
  },
  "docs.sendgrid.com": {
    "rules": [
      {
        "id": "sendgrid-com-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-docs-sendgrid-com"
      }
    ]
  },
  "lodash.com": {
    "rules": [
      {
        "id": "lodash-com-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-lodash-com"
      }
    ]
  }
};
