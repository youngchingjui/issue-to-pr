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
├─ shared/src
│ ├─ adapters/
│ ├─ entities/
│ ├─ providers/
│ ├─ ports/
│ └─ usecases/ # From "/services"
│ ├─ ui/
│ ├─ utils/
│ ├─ contracts/ # zod DTOs/events/queue payloads
│ ├─ config/ # runtime env parsing (zod)
│ └─ instrumentation/ # Langfuse/OTEL/logger init (node/edge)
│
├─ __tests__/ # Should match folder structure of file that it's testing, ie `__tests__/adapters/github/octokit/rest/issue.reader.test.ts`
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
- .env files (1 for each app or entry point, ie our main NextJS app, storybook, workers, neo4j, etc.)

## Example

Here's an end-to-end example of what a data flow might look like, and why we separate concerns into different files / folders. I highlight some design decisions below.

On /[username]/[repo]/issues/[issueId]/page.tsx, we retrieve the details of a single Github issue and display the results to the user.

### NextJS RSC

app/[username]/[repo]/issues/[issueId]/page.tsx:

```
'use server'

const result = await getIssue(repoFullName, issueNumber)
```

This is a React Server Component (RSC) - it can load data directly before returning the component, as per NextJS data fetching guidelines.

We use a server-side data fetching function directly, instead of an API route, as it's easier / faster to write, we have strongly typed parameters and results, and we can use the same function in client components.

API route handlers can also work, and we may consider them especially if there are external clients (not this NextJS app) that may call those routes. But currently there is no need to provide external client access, so internal server-side data fetching is sufficient.

---

### Data fetching (NextJS server-side)

/lib/fetch/github/issues.ts:

```
'use server'

export const getIssue = async (repoFullName: string, issueNumber: number): Promise<GetIssueResult>
```

We treat this border as an "orchestrator" of sorts. We gather the required adapters and inject these dependencies into the getIssue use case. This function exists on NextJS's NodeJS server runtime environment, so it has access to our `auth()` function.

This server-side data fetching function is like a similar counterpart to server actions, but for fetching data (like `GET`). We'll reserve server actions for mutating data (like `POST`, `PUT`, `DELETE`).

These server-side data fetching functions can only be used by RSCs. Client components should use route handlers or `swr` hooks.

We add this layer between the RSC and the use case so we don't have to concern the RSC with importing adapters, providers, etc. The RSC can focus on the UI and front-end logic, with just a very minimal line for fetching the necessary data.

Even though this could be considered a "boundary", we don't define any Zod schemas for the parameters or results here. We directly define the types for the parameters and results in the use case, and all subscribers remain typesafe.

Other server-side boundaries include server actions and API route handlers.

---

### Providers

shared/src/providers/auth/index.ts:

```
export const makeSessionProvider = (auth: () => Promise<Session>) => {}
```

These serve to lazily supply a depency value when it's needed, mostly for adapters and sometimes memoized. For example, they provide the session tokens for `octokit` or a user's API key for `openai`.

We wrap a `lazy()` helper wrapper around them so they are only instantiated and called when needed.

Like adapters, they also sit in the "infrastucture" layer. They can import 3rd party libraries.

### Adapter

shared/src/adapters/github/octokit/rest/issue.reader.ts:

```
export function makeIssueReaderAdapter(params: {
  token: string
}): IssueReaderPort
```

This adapter implements the `IssueReaderPort`. It's a REST adapter, so it uses the Octokit library.
This adapter is only concerned with the `octokit` SDK library, so it can be used by any app. It just needs an authentication token. It can also be lazily provided an authentication token.

Adapaters are also the right place to identify the types of errors that can be returned from the adapter.

---

### Use Case

shared/src/usecases/getIssue.ts:

```
export const getIssue = async (repoFullName: string, issueNumber: number): Promise<GetIssueResult>
```

This use case only requires the `IssueReaderPort`. We import the `issueReader` adapter from the fetch file. We lazily instantiate the tokens required in the adapter as soon as the adapter is called.

This is in the shared library, because other apps can also use this use case. This use case does not rely on app-specific dependencies, only ports. It's not concerned with auth, other implementations like Octokit, etc.

---
