import type { UnlockDomainConfig } from "../../types";

// Application, web, and framework documentation.
export const DEVELOPER_FRAMEWORKS_DOMAINS: Record<string, UnlockDomainConfig> = {
  "react.dev": {
    "rules": [
      {
        "id": "react-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-react-dev"
      }
    ]
  },
  "vuejs.org": {
    "rules": [
      {
        "id": "vue-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-vitepress-vuejs-org"
      }
    ]
  },
  "angular.io": {
    "rules": [
      {
        "id": "angular-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-angular-io"
      }
    ]
  },
  "nextjs.org": {
    "rules": [
      {
        "id": "nextjs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-nextjs"
      }
    ]
  },
  "nuxt.com": {
    "rules": [
      {
        "id": "nuxt-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-nuxt-com"
      }
    ]
  },
  "svelte.dev": {
    "rules": [
      {
        "id": "svelte-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-svelte-dev"
      }
    ]
  },
  "kit.svelte.dev": {
    "rules": [
      {
        "id": "sveltekit-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-kit-svelte-dev"
      }
    ]
  },
  "remix.run": {
    "rules": [
      {
        "id": "remix-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-remix-run"
      }
    ]
  },
  "astro.build": {
    "rules": [
      {
        "id": "astro-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-astro-build"
      }
    ]
  },
  "expressjs.com": {
    "rules": [
      {
        "id": "express-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-expressjs-com"
      }
    ]
  },
  "fastapi.tiangolo.com": {
    "rules": [
      {
        "id": "fastapi-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-mkdocs-fastapi-tiangolo-com"
      }
    ]
  },
  "flask.palletsprojects.com": {
    "rules": [
      {
        "id": "flask-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-sphinx-flask-palletsprojects-com"
      }
    ]
  },
  "docs.djangoproject.com": {
    "rules": [
      {
        "id": "django-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-sphinx-docs-djangoproject-com"
      }
    ]
  },
  "laravel.com": {
    "rules": [
      {
        "id": "laravel-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-laravel-com"
      }
    ]
  },
  "rubyonrails.org": {
    "rules": [
      {
        "id": "rails-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-rubyonrails-org"
      }
    ]
  },
  "htmx.org": {
    "rules": [
      {
        "id": "htmx-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-htmx-org"
      }
    ]
  },
  "alpinejs.dev": {
    "rules": [
      {
        "id": "alpine-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-alpinejs-dev"
      }
    ]
  },
  "solidjs.com": {
    "rules": [
      {
        "id": "solid-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-solidjs-com"
      }
    ]
  },
  "redux.js.org": {
    "rules": [
      {
        "id": "redux-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-redux-js-org"
      }
    ]
  },
  "tanstack.com": {
    "rules": [
      {
        "id": "tanstack-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-tanstack-com"
      }
    ]
  },
  "prisma.io": {
    "rules": [
      {
        "id": "prisma-default",
        "match": {
          "type": "prefix",
          "value": "/docs"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-prisma-io"
      }
    ]
  },
  "zod.dev": {
    "rules": [
      {
        "id": "zod-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-zod-dev"
      }
    ]
  },
  "trpc.io": {
    "rules": [
      {
        "id": "trpc-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-trpc-io"
      }
    ]
  },
  "orm.drizzle.team": {
    "rules": [
      {
        "id": "drizzle-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-orm-drizzle-team"
      }
    ]
  },
  "mongoosejs.com": {
    "rules": [
      {
        "id": "mongoose-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-mongoosejs-com"
      }
    ]
  },
  "sequelize.org": {
    "rules": [
      {
        "id": "sequelize-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-sequelize-org"
      }
    ]
  },
  "reactrouter.com": {
    "rules": [
      {
        "id": "reactrouter-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-reactrouter-com"
      }
    ]
  },
  "sass-lang.com": {
    "rules": [
      {
        "id": "sass-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-sass-lang-com"
      }
    ]
  },
  "angular.dev": {
    "rules": [
      {
        "id": "angular-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-angular-dev"
      }
    ]
  },
  "vite.dev": {
    "rules": [
      {
        "id": "vite-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-vitepress-vite-dev"
      }
    ]
  },
  "symfony.com": {
    "rules": [
      {
        "id": "symfony-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-symfony-com"
      }
    ]
  },
  "vueuse.org": {
    "rules": [
      {
        "id": "vueuse-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-vitepress-vueuse-org"
      }
    ]
  },
  "react-hook-form.com": {
    "rules": [
      {
        "id": "react-hook-form-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-react-hook-form-com"
      }
    ]
  },
  "mobx.js.org": {
    "rules": [
      {
        "id": "mobx-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-mobx-js-org"
      }
    ]
  },
  "rxjs.dev": {
    "rules": [
      {
        "id": "rxjs-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-rxjs-dev"
      }
    ]
  },
  "lit.dev": {
    "rules": [
      {
        "id": "lit-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-lit-dev"
      }
    ]
  },
  "inertiajs.com": {
    "rules": [
      {
        "id": "inertia-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-inertiajs-com",
        "max_response_bytes": 15000000
      }
    ]
  },
  "livewire.laravel.com": {
    "rules": [
      {
        "id": "livewire-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-livewire-laravel-com"
      }
    ]
  },
  "rubydoc.info": {
    "rules": [
      {
        "id": "rubydoc-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-rubydoc-info"
      }
    ]
  },
  "api.rubyonrails.org": {
    "rules": [
      {
        "id": "rails-api-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-api-rubyonrails-org"
      }
    ]
  },
  "guides.rubyonrails.org": {
    "rules": [
      {
        "id": "rails-guides-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-guides-rubyonrails-org"
      }
    ]
  },
  "hotwired.dev": {
    "rules": [
      {
        "id": "hotwired-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-hotwired-dev"
      }
    ]
  },
  "turbo.hotwired.dev": {
    "rules": [
      {
        "id": "turbo-hotwired-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-turbo-hotwired-dev"
      }
    ]
  },
  "stimulus.hotwired.dev": {
    "rules": [
      {
        "id": "stimulus-hotwired-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-stimulus-hotwired-dev"
      }
    ]
  },
  "redux-toolkit.js.org": {
    "rules": [
      {
        "id": "redux-toolkit-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-redux-toolkit-js-org"
      }
    ]
  },
  "zustand.docs.pmnd.rs": {
    "rules": [
      {
        "id": "zustand-docs-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-zustand-docs-pmnd-rs",
        "max_response_bytes": 15000000
      }
    ]
  },
  "qwik.dev": {
    "rules": [
      {
        "id": "qwik-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-qwik-dev"
      }
    ]
  },
  "typeorm.io": {
    "rules": [
      {
        "id": "typeorm-io-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-docusaurus-typeorm-io"
      }
    ]
  },
  "preactjs.com": {
    "rules": [
      {
        "id": "preactjs-com-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-preactjs-com"
      }
    ]
  },
  "router.vuejs.org": {
    "rules": [
      {
        "id": "router-vuejs-org-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-vitepress-router-vuejs-org"
      }
    ]
  },
  "pinia.vuejs.org": {
    "rules": [
      {
        "id": "pinia-vuejs-org-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-vitepress-pinia-vuejs-org"
      }
    ]
  },
  "valibot.dev": {
    "rules": [
      {
        "id": "valibot-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-vitepress-valibot-dev"
      }
    ]
  },
  "nx.dev": {
    "rules": [
      {
        "id": "nx-dev-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-nx-dev"
      }
    ]
  },
  "docs.deno.com": {
    "rules": [
      {
        "id": "deno-com-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-docs-deno-com"
      }
    ]
  },
  "payloadcms.com": {
    "rules": [
      {
        "id": "payloadcms-com-default",
        "match": {
          "type": "prefix",
          "value": "/"
        },
        "allowed_strategies": [
          "fetch",
          "browser"
        ],
        "entry_strategy": "fetch",
        "parser": "docs-site-payloadcms-com"
      }
    ]
  }
};
