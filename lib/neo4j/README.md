# Neo4j Layer Structure

This directory contains the data access and business logic layers for Neo4j.

## Structure

- `repositories/`: Low-level database access. Responsible for running Cypher queries, mapping raw Neo4j nodes/relationships to **db-level TypeScript types** (see `lib/types/db/neo4j.ts`), and nothing else. **No business logic or application rules should be here.**

  - Example: Fetching a `WorkflowRun` node and its properties from the database.
  - Always use db-level types for input/output, and validate with db-level Zod schemas.

- `services/`: Business/application logic. Responsible for orchestrating repository calls, applying business rules, deriving computed state, and enriching data for use by the rest of the application (using **app-level types** from `lib/types/index.ts`).
  - Example: Deriving a workflow run's effective state (e.g., timeout logic), combining workflow runs with their issues, or transforming raw data into application-level objects.
  - Service functions convert db-level types to app-level types before returning data to the rest of the app, often using conversion utilities (see below).

## Type Layering and Mapping

- **App-Level Types** (`lib/types/index.ts`):

  - Canonical types for the application, using standard JS/TS types (e.g., `number`, `Date`).
  - Used throughout the app for business logic, API, and UI.

- **DB-Level Types** (`lib/types/db/neo4j.ts`):

  - Extend or adapt app-level types for Neo4j storage (e.g., using `neo4j-driver`'s `Integer`, `DateTime`).
  - Used for all repository/database operations.
  - Built by merging/omitting/extending app-level schemas, not redefining from scratch.

- **Mapping/Transformation**:
  - When reading from or writing to Neo4j, always use db-level types for validation and parsing.
  - When returning data to the app layer, convert Neo4j types (e.g., `Integer`, `DateTime`) to JS types (e.g., `number`, `Date`).
  - Use conversion utilities like `neo4jToJs` and `jsToNeo4j` in `lib/neo4j/convert.ts` for this purpose.

## Example Workflow

1. **Define app-level schema** in `/lib/types/index.ts`:
   ```ts
   export const PlanSchema = z.object({ ... })
   export type Plan = z.infer<typeof PlanSchema>
   ```
2. **Define db-level schema** in `/lib/types/db/neo4j.ts` by extending the app-level schema:
   ```ts
   import { PlanSchema as AppPlanSchema } from "../index"
   export const PlanSchema = AppPlanSchema.merge(
     z.object({
       version: z.instanceof(Integer),
       createdAt: z.instanceof(DateTime),
     })
   )
   export type Plan = z.infer<typeof PlanSchema>
   ```
3. **Repository functions** use db-level types for all database operations and validation.
4. **Service functions** convert db-level types to app-level types before returning to the rest of the app.
5. **Conversion utilities** handle the translation between Neo4j and JS/TS types.

## Summary Table

| Layer      | File Location             | Type Example      | Notes                                      |
| ---------- | ------------------------- | ----------------- | ------------------------------------------ |
| App-level  | `lib/types/index.ts`      | `Plan`, `Task`    | Uses JS/TS types, main app data structures |
| DB-level   | `lib/types/db/neo4j.ts`   | `Plan`, `Task`    | Uses Neo4j types, extends app-level types  |
| Repository | `lib/neo4j/repositories/` | `create`, `get`   | Uses db-level types for tx functions       |
| Service    | `lib/neo4j/services/`     | `toAppPlan`, etc. | Converts db-level to app-level types       |
| Conversion | `lib/neo4j/convert.ts`    | `neo4jToJs`, etc. | Handles type conversion logic              |

## Rule of thumb

- If it runs a Cypher query or parses raw Neo4j data, it belongs in `repositories/` and should use db-level types.
- If it applies business rules, combines entities, or computes derived state, it belongs in `services/` and should return app-level types.
- Always use conversion utilities to bridge between Neo4j and JS/TS types.
