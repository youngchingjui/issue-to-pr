/* =================================================
 # Neo4j Data Source
 New neo4j configuration using shared adapter.
 Use this instead of old client in lib/neo4j/client.ts
 For NextJS node server only.
 We import env variables here at app level
 We create a driver at process level to avoid creating a new driver for each request
 So that we can pool connections and manage sessions more efficiently
 ================================================= */
import "server-only"

import {
  createNeo4jDataSource,
  type Neo4jDataSource,
} from "shared/adapters/neo4j/dataSource"

declare global {
  // cache across HMR
  // eslint-disable-next-line no-var
  var __neo4jDs__: Neo4jDataSource | undefined
}

const uri = process.env.NEO4J_URI
const user = process.env.NEO4J_USER
const password = process.env.NEO4J_PASSWORD
if (!uri || !user || !password) {
  throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set")
}

export const neo4jDs: Neo4jDataSource =
  global.__neo4jDs__ ??
  (global.__neo4jDs__ = createNeo4jDataSource({
    uri,
    user,
    password,
  }))
