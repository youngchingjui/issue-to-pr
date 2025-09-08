// New neo4j configuration using shared adapter.
// Use this instead of old client in lib/neo4j/client.ts
// For NextJS node server only.
import "server-only"

import { createNeo4jDataSource } from "@shared/adapters/neo4j/dataSource"

declare global {
  // cache across HMR
  // eslint-disable-next-line no-var
  var __neo4jDs__: ReturnType<typeof createNeo4jDataSource> | undefined
}

if (
  !process.env.NEO4J_URI ||
  !process.env.NEO4J_USER ||
  !process.env.NEO4J_PASSWORD
) {
  throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set")
}

export const neo4jDs =
  global.__neo4jDs__ ??
  (global.__neo4jDs__ = createNeo4jDataSource({
    uri: process.env.NEO4J_URI,
    user: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
  }))
