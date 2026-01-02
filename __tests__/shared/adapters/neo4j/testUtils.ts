import {
  createNeo4jDataSource,
  type Neo4jDataSource,
} from "@/shared/adapters/neo4j/dataSource"

/**
 * Test utilities for Neo4j integration tests
 * These utilities help set up and tear down test data in a local Neo4j instance
 */

/**
 * Creates a Neo4j data source for testing
 * Uses environment variables: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 */
export function createTestDataSource(): Neo4jDataSource {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD

  if (!uri || !user || !password) {
    throw new Error(
      "NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set for integration tests. " +
        "Create a .env.local file with these values pointing to your local Neo4j instance."
    )
  }

  return createNeo4jDataSource({
    uri,
    user,
    password,
  })
}

/**
 * Verifies the Neo4j connection is working
 */
export async function verifyConnection(ds: Neo4jDataSource): Promise<void> {
  const session = ds.getSession("READ")
  try {
    const result = await session.run("RETURN 1 AS num")
    const value = result.records[0]?.get("num").toNumber()
    if (value !== 1) {
      throw new Error("Connection test failed - unexpected result")
    }
  } finally {
    await session.close()
  }
}

/**
 * Cleanup helper - removes test data created during tests
 * This is designed to be safe and only remove specific test nodes
 *
 * WARNING: This will delete nodes! Only use on test databases.
 */
export async function cleanupTestData(
  ds: Neo4jDataSource,
  testRunIds: string[]
): Promise<void> {
  if (testRunIds.length === 0) return

  const session = ds.getSession("WRITE")
  try {
    // Delete workflow runs and their relationships created during tests
    await session.run(
      `
      MATCH (wr:WorkflowRun)
      WHERE wr.id IN $runIds
      DETACH DELETE wr
    `,
      { runIds: testRunIds }
    )
  } finally {
    await session.close()
  }
}

/**
 * Get count of nodes by label for verification
 */
export async function getNodeCount(
  ds: Neo4jDataSource,
  label: string
): Promise<number> {
  const session = ds.getSession("READ")
  try {
    const result = await session.run(
      `MATCH (n:${label}) RETURN count(n) AS count`
    )
    return result.records[0]?.get("count").toNumber() ?? 0
  } finally {
    await session.close()
  }
}

/**
 * Check if a specific workflow run exists
 */
export async function workflowRunExists(
  ds: Neo4jDataSource,
  runId: string
): Promise<boolean> {
  const session = ds.getSession("READ")
  try {
    const result = await session.run(
      `MATCH (wr:WorkflowRun {id: $runId}) RETURN wr`,
      { runId }
    )
    return result.records.length > 0
  } finally {
    await session.close()
  }
}
