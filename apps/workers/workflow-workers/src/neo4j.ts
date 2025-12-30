import {
  createNeo4jDataSource,
  type Neo4jDataSource,
} from "@/shared/dist/adapters/neo4j/dataSource"

import { getEnvVar } from "./helper"

let _neo4jDs: Neo4jDataSource | undefined

const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = getEnvVar()

// Create a singleton instance of the Neo4j data source
// So we can utilize their connection pools and session management
// And avoid creating a new driver for each request

export const neo4jDs =
  _neo4jDs ??
  (_neo4jDs = createNeo4jDataSource({
    uri: NEO4J_URI,
    user: NEO4J_USER,
    password: NEO4J_PASSWORD,
  }))
