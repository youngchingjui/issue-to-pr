# @types Folder Organization & Schema Conventions

## General Principles

- Use [Zod](https://zod.dev/) for all schema definitions.
- Always export both the Zod schema and its inferred TypeScript type for type safety across the codebase.

## Folder/File Structure

- **API Schemas:**

  - Define both Request and Response schemas for each API route.
  - Place all API schemas in `/lib/types/api/` folder.
  - File and schema naming convention TBD.
  - These schemas should be imported by both client and server to ensure type safety for API calls and responses.

- **Database Schemas:**

  - Place database model schemas in their respective files:
    - `/lib/types/db/neo4j.ts` for Neo4j models
    - `/lib/types/db/postgres.ts` for Postgres models
  - These schemas represent the structure of data as stored in the database.
  - When a database schema is related to an application-layer schema, the DB schema should extend or build off the application-layer schema, not redefine it from scratch. This makes the differences and required transforms explicit.

- **Application-Layer Schemas:**
  - Place general application-layer schemas in `index.ts`.
  - These schemas represent the main data structures used throughout the app (e.g., Plan, Event, etc.).
  - Organization for application-layer schemas TBD.

## Example Workflow

1. **Define application-layer schema** in `/lib/types/index.ts`:
   ```ts
   export const UserSchema = z.object({ ... })
   export type User = z.infer<typeof UserSchema>
   ```
2. **Define DB schema** in `/lib/types/db/neo4j.ts` or `/lib/types/db/postgres.ts` by extending the application-layer schema:
   ```ts
   import { UserSchema } from '../index'
   export const Neo4jUserSchema = UserSchema.extend({ ... })
   export type Neo4jUser = z.infer<typeof Neo4jUserSchema>
   ```
3. **Define API schemas** in `/lib/types/api/schemas.ts`:
   ```ts
   export const GetUserRequestSchema = z.object({ ... })
   export const GetUserResponseSchema = z.object({ ... })
   export type GetUserRequest = z.infer<typeof GetUserRequestSchema>
   export type GetUserResponse = z.infer<typeof GetUserResponseSchema>
   ```

## Benefits

- **Type safety** across client, server, and database layers.
- **Single source of truth** for data structures.
- **Explicit transforms** between application and database models.
- **Easy to find and update schemas** by following the folder/file conventions.
