# Neo4j

The types in `types.ts` are db-level types that use Neo4j-specific types (ie `Integer`, `DateTime`).
They might closely match our app-level types (see `@/shared/types/index.ts`), but we define them separately so we can easily stay true to the shape of the nodes in the neo4j database.
