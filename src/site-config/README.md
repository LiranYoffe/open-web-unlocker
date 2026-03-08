# Site Config Layout

This directory is the single declarative source of truth for unlock policy and parser routing.

Structure:
- `defaults.ts`: global fallback strategy/timeouts/headers.
- `aliases.ts`: canonical host aliases grouped by domain family.
- `domains/*.ts`: per-family domain config modules. Each domain keeps its `defaults` and `rules` together.
- `index.ts`: combines the modules into the `RULES_CONFIG` export consumed by `src/config.ts`.

Guidelines:
- Add or change parser selection at the path-rule level inside the relevant domain module.
- Put consent/challenge/browser defaults at the domain level unless a path truly needs different behavior.
- Keep generic-only sites in `domains/general.ts` until they earn a dedicated family or parser.
- Preserve stable rule ids; tests and sample coverage depend on them.
