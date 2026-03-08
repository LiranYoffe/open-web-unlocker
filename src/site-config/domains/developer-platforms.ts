import type { UnlockDomainConfig } from "../../types";

// Cloud, infra, database, and platform documentation.
export const DEVELOPER_PLATFORMS_DOMAINS: Record<string, UnlockDomainConfig> = {
  "docs.aws.amazon.com": {
    "rules": [
      {
        "id": "aws-default",
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
  "cloud.google.com": {
    "rules": [
      {
        "id": "gcp-default",
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
  "learn.microsoft.com": {
    "rules": [
      {
        "id": "mslearn-default",
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
  "docs.docker.com": {
    "rules": [
      {
        "id": "docker-default",
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
  "kubernetes.io": {
    "rules": [
      {
        "id": "k8s-default",
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
  "developer.hashicorp.com": {
    "rules": [
      {
        "id": "hashicorp-default",
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
  "docs.github.com": {
    "rules": [
      {
        "id": "ghd-default",
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
  "docs.gitlab.com": {
    "rules": [
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
        "entry_strategy": "fetch",
        "parser": "docs-site"
      }
    ]
  },
  "docs.netlify.com": {
    "rules": [
      {
        "id": "netlify-default",
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
  "vercel.com": {
    "rules": [
      {
        "id": "vercel-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "developers.cloudflare.com": {
    "rules": [
      {
        "id": "cf-default",
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
  "render.com": {
    "rules": [
      {
        "id": "render-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "fly.io": {
    "rules": [
      {
        "id": "fly-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "www.postgresql.org": {
    "rules": [
      {
        "id": "pg-default",
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
  "dev.mysql.com": {
    "rules": [
      {
        "id": "mysql-default",
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
  "www.mongodb.com": {
    "rules": [
      {
        "id": "mongo-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "redis.io": {
    "rules": [
      {
        "id": "redis-default",
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
  "www.sqlite.org": {
    "rules": [
      {
        "id": "sqlite-default",
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
  "clickhouse.com": {
    "rules": [
      {
        "id": "ch-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "www.elastic.co": {
    "rules": [
      {
        "id": "elastic-default",
        "match": {
          "type": "prefix",
          "value": "/guide"
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
  "supabase.com": {
    "rules": [
      {
        "id": "supabase-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "stripe.com": {
    "rules": [
      {
        "id": "stripe-docs",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "auth0.com": {
    "rules": [
      {
        "id": "auth0-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "clerk.com": {
    "rules": [
      {
        "id": "clerk-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "resend.com": {
    "rules": [
      {
        "id": "resend-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "docs.sentry.io": {
    "rules": [
      {
        "id": "sentry-default",
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
  "posthog.com": {
    "rules": [
      {
        "id": "posthog-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
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
  "firebase.google.com": {
    "rules": [
      {
        "id": "firebase-docs-default",
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
  "developer.atlassian.com": {
    "rules": [
      {
        "id": "atlassian-dev-default",
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
  "docs.oracle.com": {
    "rules": [
      {
        "id": "oracle-docs-default",
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
  "grafana.com": {
    "rules": [
      {
        "id": "grafana-docs-default",
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
  "prometheus.io": {
    "rules": [
      {
        "id": "prometheus-docs-default",
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
  "nginx.org": {
    "rules": [
      {
        "id": "nginx-docs-default",
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
  "docs.snowflake.com": {
    "rules": [
      {
        "id": "snowflake-docs-default",
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
  "developer.salesforce.com": {
    "rules": [
      {
        "id": "salesforce-dev-default",
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
  "sqlalchemy.org": {
    "rules": [
      {
        "id": "sqlalchemy-docs-default",
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
  "docs.sqlalchemy.org": {
    "rules": [
      {
        "id": "sqlalchemy-hosted-docs-default",
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
  "cassandra.apache.org": {
    "rules": [
      {
        "id": "cassandra-apache-org-default",
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
  "docs.influxdata.com": {
    "rules": [
      {
        "id": "influxdata-com-default",
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
  "docs.microsoft.com": {
    "rules": [
      {
        "id": "microsoft-com-default",
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
  "planetscale.com": {
    "rules": [
      {
        "id": "planetscale-com-default",
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
