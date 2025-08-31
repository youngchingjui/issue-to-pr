# Target Code Structure

We will slowly migrate to this structure over many commits. Each commit that moves files to their target destionation would require some amount of testing to make sure we dont' break anything, so we should do this over a series of commits and changes, gradually.

```
.
├─ apps/
│ ├─ web/
│ │ ├─ app/
│ │ │ ├─ (routes)
│ │ │ ├─ api/
│ │ │ ├─ layout.tsx
│ │ │ └─ page.tsx
│ │ ├─ components/ # shared UI only (no domain/infra)
│ │ ├─ hooks/
│ │ ├─ contracts/ # Next.js-specific contracts for boundary handling
│ │ │ ├─ api/
│ │ │ └─ actions/
│ │ ├─ public/
│ │ │ ├─ images/
│ │ │ └─ blogs/
│ │ ├─ actions/
│ │ ├─ styles/
│ │ ├─ middleware.ts
│ │ ├─ package.json
│ │ ├─ tsconfig.json
│ │ └─ next.config.js
│ │
│ ├─ storybook/
│ │ ├─ src/
│ │ ├─ .storybook/
│ │ ├─ package.json
│ │ ├─ tsconfig.json
│ │ ├─ tailwind.config.ts
│ │ └─ vitest.config.ts
│ │
│ ├─ realtime-openai-agents/
│ │ ├─ src/
│ │ ├─ public/
│ │ ├─ package.json
│ │ ├─ tsconfig.json
│ │ ├─ tailwind.config.ts
│ │ └─ next.config.ts
│ │
│ └─ workers/
│   └─ src/
│     ├─ index.ts
│     ├─ tsconfig.json
│     └─ package.json
│
├─ packages/
│ ├─ domain/ # ports/use-cases/entities (pure)
│ │ ├─ entities/
│ │ ├─ ports/
│ │ └─ use-cases/ # From "/services"
│ ├─ data-access/ # neo4j, redis, (postgres later)
│ │ └─ neo4j/
│ │   ├─ repositories/
│ │   └─ migrations/
│ ├─ messaging/ # BullMQ producers & queue clients (Node)
│ ├─ contracts/ # zod DTOs/events/queue payloads
│ ├─ external-clients/ # openai/anthropic/octokit/assembly/dockerode (node/edge subpaths)
│ ├─ auth/
│ ├─ config/ # runtime env parsing (zod)
│ ├─ utils/
│ ├─ ui/
│ └─ instrumentation/ # Langfuse/OTEL/logger init (node/edge)
│
├─ tests/ # from __tests__. Should match folder structure of file that it's testing, ie `tests/packages/domain/foo.test.ts`
│
├─ docs/
│
├─ .github/
│
├─ infra/
│ ├─ docker/
│ │ └─ docker-compose.yml
│ └─ scripts/
│
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ .env.example
```

## Not sure where to put yet

- tailwind config (`tailwind.config.ts`)
- eslint config (`eslint.config.js`)
- prettierrc (`prettierrc`)
- .env files (needed for various nextjs apps, storybook, neo4j, etc.)
