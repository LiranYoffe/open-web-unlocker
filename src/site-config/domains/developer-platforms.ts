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
        "parser": "docs-site-docs-aws-amazon-com"
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
        "parser": "docs-devsite-cloud-google-com"
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
        "parser": "docs-site-learn-microsoft-com"
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
        "parser": "docs-mkdocs-docs-docker-com"
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
        "parser": "docs-mkdocs-kubernetes-io"
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
        "parser": "docs-mkdocs-developer-hashicorp-com"
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
        "parser": "docs-site-docs-github-com"
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
        "parser": "docs-site-docs-gitlab-com"
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
        "parser": "docs-site-docs-netlify-com"
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
        "parser": "docs-site-vercel-com"
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
        "parser": "docs-site-developers-cloudflare-com"
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
        "parser": "docs-site-render-com"
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
        "parser": "docs-site-fly-io"
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
        "parser": "docs-site-www-postgresql-org"
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
        "parser": "docs-site-dev-mysql-com"
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
        "parser": "docs-site-www-mongodb-com"
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
        "parser": "docs-site-redis-io"
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
        "parser": "docs-site-www-sqlite-org"
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
        "parser": "docs-site-clickhouse-com"
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
        "parser": "docs-site-www-elastic-co"
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
        "parser": "docs-site-supabase-com"
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
        "parser": "docs-site-stripe-com"
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
        "parser": "docs-site-auth0-com"
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
        "parser": "docs-site-clerk-com"
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
        "parser": "docs-site-resend-com"
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
        "parser": "docs-docusaurus-docs-sentry-io"
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
        "parser": "docs-site-posthog-com"
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
        "parser": "docs-devsite-firebase-google-com"
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
        "parser": "docs-site-developer-atlassian-com"
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
        "parser": "docs-site-docs-oracle-com"
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
        "parser": "docs-mkdocs-grafana-com"
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
        "parser": "docs-site-prometheus-io"
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
        "parser": "docs-site-nginx-org"
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
        "parser": "docs-site-docs-snowflake-com"
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
        "parser": "docs-site-developer-salesforce-com"
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
        "parser": "docs-sphinx-sqlalchemy-org"
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
        "parser": "docs-sphinx-docs-sqlalchemy-org"
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
        "parser": "docs-site-cassandra-apache-org"
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
        "parser": "docs-site-docs-influxdata-com"
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
        "parser": "docs-site-docs-microsoft-com"
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
        "parser": "docs-site-planetscale-com"
      }
    ]
  }
};
