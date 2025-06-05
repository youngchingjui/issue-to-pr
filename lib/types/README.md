# @types Folder Organization & Schema Conventions

## General Principles

- Use [Zod](https://zod.dev/) for all schema definitions.
- Always export both the Zod schema and its inferred TypeScript type for type safety across the codebase.
- Organize schemas and types by domain/concern for scalability and maintainability.
- Use `index.ts` as a central re-export ("barrel") file, not as a place to define all schemas inline.

## Folder/File Structure

### **Recommended Structure**

```
/lib/types/
  index.ts                # Re-exports all app-layer schemas/types
  workflow.ts             # Workflow-related schemas/types
  plan.ts                 # Plan-related schemas/types
  event.ts                # Event schemas/types
  settings.ts             # User/repo settings schemas/types
  github.ts               # GitHub-specific schemas/types
  api/                    # API request/response schemas
  db/
    neo4j.ts              # Neo4j DB schemas (extending app-layer)
    postgres.ts           # Postgres DB schemas (extending app-layer)
  schemas/                # (Optional) For shared or utility schemas
```

- **Each concern (domain) gets its own file** (or subfolder if it grows large).
- **`index.ts` is for re-exports only**—do not define schemas/types here.
- **Subfolders** (e.g., `github/`, `api/`, `db/`) are encouraged for large or complex domains.

### **Layered Schema Design**

- **Application-Layer Schemas:**

  - Main data structures used throughout the app (e.g., Plan, Event, WorkflowRun, Settings).
  - Place in their own files by concern (e.g., `plan.ts`, `event.ts`).
  - Re-export from `index.ts` for a single import point.

- **API Schemas:**

  - Define request and response schemas for each API route.
  - Place in `/lib/types/api/`.
  - Import application-layer schemas as needed for consistency.

- **Database Schemas:**
  - Place in `/lib/types/db/` (e.g., `neo4j.ts`, `postgres.ts`).
  - Extend application-layer schemas to represent DB-specific structure or requirements.
  - Make differences and required transforms explicit.

## Example Workflow

1. **Define application-layer schema** in `/lib/types/plan.ts`:
   ```ts
   // lib/types/plan.ts
   import { z } from 'zod'
   export const planSchema = z.object({ ... })
   export type Plan = z.infer<typeof planSchema>
   ```
2. **Extend for DB schema** in `/lib/types/db/neo4j.ts`:
   ```ts
   // lib/types/db/neo4j.ts
   import { planSchema } from '../plan'
   export const Neo4jPlanSchema = planSchema.extend({ ... })
   export type Neo4jPlan = z.infer<typeof Neo4jPlanSchema>
   ```
3. **Define API schemas** in `/lib/types/api/plan.ts`:
   ```ts
   // lib/types/api/plan.ts
   import { planSchema } from '../plan'
   export const GetPlanResponseSchema = planSchema.extend({ ... })
   export type GetPlanResponse = z.infer<typeof GetPlanResponseSchema>
   ```
4. **Re-export in `/lib/types/index.ts`**:
   ```ts
   // lib/types/index.ts
   export * from "./plan"
   export * from "./event"
   export * from "./settings"
   export * from "./workflow"
   export * from "./github"
   ```

## Best Practices

- **Scalability:** Each file stays focused and manageable as the codebase grows.
- **Discoverability:** Easy to find schemas/types by concern or domain.
- **Maintainability:** Refactoring is easier; all related types are grouped together.
- **Single Source of Truth:** Central `index.ts` for app-layer types, but not a god file.
- **Explicit Transforms:** DB schemas should extend app-layer schemas, not redefine them.
- **Documentation:** Keep this README up to date with conventions and examples.

## Benefits

- **Type safety** across client, server, and database layers.
- **Single source of truth** for data structures.
- **Explicit transforms** between application and database models.
- **Easy to find and update schemas** by following the folder/file conventions.

---

**When adding a new schema or type:**

- Place it in the file that matches its concern/domain.
- If it's a new domain, create a new file or subfolder.
- Only add to `index.ts` to re-export for convenience.
- Extend, don't duplicate, for DB/API variants.
