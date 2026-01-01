import { createNeo4jDataSource } from "shared/adapters/neo4j/dataSource"
import type { Neo4jDataSource } from "shared/adapters/neo4j/dataSource"

let _ds: Neo4jDataSource | undefined

export function getWorkerNeo4jDs(): Neo4jDataSource {
  if (_ds) return _ds

  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD
  if (!uri || !user || !password) {
    throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set for workers")
  }

  _ds = createNeo4jDataSource({ uri, user, password })
  return _ds
}

