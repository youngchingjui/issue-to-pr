// apps/workers/workflow-workers/src/neo4j.ts
import { createNeo4jDataSource } from "shared/adapters/neo4j/dataSource"

import { getEnvVar } from "./helper"

const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = getEnvVar()

export const neo4jDs = createNeo4jDataSource({
  uri: NEO4J_URI,
  user: NEO4J_USER,
  password: NEO4J_PASSWORD,
})
