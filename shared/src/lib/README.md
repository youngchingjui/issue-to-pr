This folder is only to help with the migration from our old `lib` folder to our new `shared/` folder following cleaning code structure.
We should slowly migrate and refactor any code in this folder to properly fit the clean code architecture we've been attempting to achieve in the `shared/` folder.

**Shared code must not read environment variables directly.** Env reads happen at app boundaries — NextJS via `lib/env.ts`, the workflow worker via `apps/workers/workflow-workers/src/schemas.ts` (`getEnvVar()`). Each app validates its own env with Zod and passes the values into shared code as explicit parameters. This keeps `shared/` portable across apps and avoids hidden import-time `process.env` reads that break depending on load order.
