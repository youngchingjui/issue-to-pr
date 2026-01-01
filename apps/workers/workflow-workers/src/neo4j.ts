import {
  createNeo4jDataSource,
  type Neo4jDataSource,
} from "@/shared/adapters/neo4j/dataSource"

import { getEnvVar } from "./helper"

let _ds: Neo4jDataSource | undefined

export function getWorkerNeo4jDs(): Neo4jDataSource {
  if (_ds) return _ds

  const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = getEnvVar()

  _ds = createNeo4jDataSource({
    uri: NEO4J_URI,
    user: NEO4J_USER,
    password: NEO4J_PASSWORD,
  })
  return _ds
}
