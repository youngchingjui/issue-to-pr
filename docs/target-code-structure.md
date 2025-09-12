# Target Code Structure

We’ll gradually migrate to the following structure over a series of commits. Each step should include sufficient testing to ensure nothing breaks before moving on.

```
.
├─ apps/
│ ├─ web/
│ │ ├─ app/
│ │ │ ├─ (routes)
│ │ │ ├─ api/
│ │ │ ├─ layout.tsx
│ │ │ └─ page.tsx
│ │ ├─ components/ # Shared UI only (no domain/infra)
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
├─ shared/src
│ ├─ adapters/
│ ├─ entities/
│ ├─ providers/
│ ├─ ports/
│ ├─ usecases/ # From "/services"
│ ├─ ui/
│ ├─ utils/
│ ├─ contracts/ # Zod DTOs/events/queue payloads
│ ├─ config/ # Runtime env parsing (zod)
│ └─ instrumentation/ # Langfuse/OTEL/logger init (node/edge)
│
├─ __tests__/ # Mirrors folder structure of tested files
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

### Still to Decide

- tailwind.config.ts
- eslint.config.js
- .prettierrc
- .env files (one per app/entry point: Next.js app, storybook, workers, Neo4j, etc.)

## Example Data Flow

Here’s an example of how the layers work together when rendering a GitHub issue page:

### React Server Component (RSC)

app/[username]/[repo]/issues/[issueId]/page.tsx

```tsx
"use server"

const result = await getIssue(repoFullName, issueNumber)
```

- This RSC fetches data directly (per Next.js data fetching guidelines).
- It calls a server-side fetching function, rather than an API route, because:
- It’s faster and simpler.
- Strong typing ensures type safety.
- There’s no need to expose this API to external clients right now.

API routes may still be introduced later if we need to support external consumers.

### Server-Side Data Fetching

/lib/fetch/github/issues.ts

```ts
'use server'

export const getIssue = async (repoFullName: string, issueNumber: number): Promise<GetIssueResult>
```

- Acts as an orchestrator: wires up adapters, providers, and dependencies, then passes them to the use case.
- Runs in Next.js’s Node.js server runtime, so it has access to auth() and other server-only utilities.
- Similar in concept to server actions, but reserved for read operations (GET).
- Use server actions for mutations (POST, PUT, DELETE).
- Only usable by RSCs.
- For client components, use route handlers or hooks like swr.

We don’t define Zod schemas here—the use case defines the types directly, keeping subscribers type-safe.

### Providers

shared/src/providers/auth/auth.ts

```ts
export const makeSessionProvider = (auth: () => Promise<Session>) => {}
```

- Lazily supply dependencies (e.g., session tokens, API keys).
- Often memoized, so they’re only created when needed.
- Considered part of the infrastructure layer.
- They may import third-party libraries.
- Example: providing session tokens for Octokit or API keys for OpenAI.

### Adapters

shared/src/adapters/github/octokit/rest/issue.reader.ts

```ts
export function makeIssueReaderAdapter(params: {
  token: string
}): IssueReaderPort
```

    •	Implements a port (in this case, IssueReaderPort).
    •	Concerned only with the Octokit SDK and GitHub’s REST API.
    •	Can be reused by any app—only needs a token.
    •	Responsible for:
    •	Talking to third-party libraries.
    •	Identifying possible error types returned by the external system.

### Use Case

shared/src/usecases/getIssue.ts

```ts
export const getIssue = async (repoFullName: string, issueNumber: number): Promise<GetIssueResult>
```

- Encapsulates domain logic and depends only on ports.
- Imported into the fetch layer (which provides adapters/providers).
- Lives in the shared library so it can be reused across apps.
- Doesn’t deal with authentication or SDK specifics—that’s handled by adapters/providers.

## Summary of Design Decisions

- RSCs → simple, UI-focused, and fetch data via server functions.
- Server-side fetch functions → orchestrators; inject dependencies and call use cases.
- Providers → supply dependencies (auth, API keys, sessions).
- Adapters → handle external libraries/SDKs; implement ports.
- Use cases → domain logic, reusable across apps, no infrastructure concerns.
