import * as dotenv from "dotenv"
import * as path from "path"

import {
  createNeo4jDataSource,
  type Neo4jDataSource,
} from "@/shared/adapters/neo4j/dataSource"

/**
 * Test utilities for Neo4j integration tests
 * These utilities help set up and tear down test data in a local Neo4j instance
 */

// Load test-specific environment variables from __tests__/.env.neo4j
// This allows tests to use a separate test database
const testEnvPath = path.resolve(__dirname, "../../../.env.neo4j")
dotenv.config({ path: testEnvPath })

/**
 * Creates a Neo4j data source for testing
 * Uses environment variables from __tests__/.env: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
 */
export function createTestDataSource(): Neo4jDataSource {
  const uri = process.env.NEO4J_URI
  const user = process.env.NEO4J_USER
  const password = process.env.NEO4J_PASSWORD

  if (!uri || !user || !password) {
    throw new Error(
      "NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set for integration tests.\n" +
        "Create a __tests__/.env.neo4j file (use __tests__/.env.neo4j.example as a template) with these values pointing to your TEST Neo4j database.\n" +
        "IMPORTANT: Use a separate test database, not your production/development database!"
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
    // Delete workflow runs and all related nodes created during tests
    // This includes repositories, issues, commits, and actors that were created
    await session.run(
      `
      // Find all workflow runs to delete
      MATCH (wr:WorkflowRun)
      WHERE wr.id IN $runIds

      // Find related nodes
      OPTIONAL MATCH (wr)-[:BASED_ON_REPOSITORY]->(repo:Repository)
      OPTIONAL MATCH (wr)-[:BASED_ON_ISSUE]->(issue:Issue)
      OPTIONAL MATCH (wr)-[:BASED_ON_COMMIT]->(commit:Commit)
      OPTIONAL MATCH (wr)-[:INITIATED_BY]->(actor)

      // Only delete repositories/issues/commits/actors if they're ONLY connected to these test workflow runs
      // First, detach delete the workflow run
      DETACH DELETE wr

      // Then check and delete orphaned nodes
      WITH repo, issue, commit, actor
      WHERE repo IS NOT NULL
      WITH repo, issue, commit, actor
      OPTIONAL MATCH (repo)<-[:BASED_ON_REPOSITORY]-(otherWr:WorkflowRun)
      WITH repo, issue, commit, actor, count(otherWr) AS repoConnections
      WHERE repoConnections = 0
      DETACH DELETE repo

      WITH issue, commit, actor
      WHERE issue IS NOT NULL
      WITH issue, commit, actor
      OPTIONAL MATCH (issue)<-[:BASED_ON_ISSUE]-(otherWr2:WorkflowRun)
      WITH issue, commit, actor, count(otherWr2) AS issueConnections
      WHERE issueConnections = 0
      DETACH DELETE issue

      WITH commit, actor
      WHERE commit IS NOT NULL
      WITH commit, actor
      OPTIONAL MATCH (commit)<-[:BASED_ON_COMMIT]-(otherWr3:WorkflowRun)
      WITH commit, actor, count(otherWr3) AS commitConnections
      WHERE commitConnections = 0
      DETACH DELETE commit

      WITH actor
      WHERE actor IS NOT NULL
      OPTIONAL MATCH (actor)<-[:INITIATED_BY]-(otherWr4:WorkflowRun)
      WITH actor, count(otherWr4) AS actorConnections
      WHERE actorConnections = 0
      DETACH DELETE actor
    `,
      { runIds: testRunIds }
    )
  } finally {
    await session.close()
  }
}

export async function cleanupWorkflowRunTestData(
  ds: Neo4jDataSource,
  {
    runIds = [],
    repoIds = [],
    issues = [],
    userIds = [],
    githubUserIds = [],
    commitShas = [],
  }: {
    runIds?: string[]
    repoIds?: string[]
    issues?: { repoFullName: string; number: number }[]
    userIds?: string[]
    githubUserIds?: string[]
    commitShas?: string[]
  }
): Promise<void> {
  const session = ds.getSession("WRITE")
  try {
    if (runIds.length > 0) {
      await session.run(
        `
        MATCH (wr:WorkflowRun)
        WHERE wr.id IN $runIds
        DETACH DELETE wr
      `,
        { runIds }
      )
    }

    if (issues.length > 0) {
      await session.run(
        `
        UNWIND $issues AS issue
        MATCH (i:Issue { repoFullName: issue.repoFullName, number: issue.number })
        DETACH DELETE i
      `,
        { issues }
      )
    }

    if (repoIds.length > 0) {
      await session.run(
        `
        MATCH (r:Repository)
        WHERE r.id IN $repoIds
        DETACH DELETE r
      `,
        { repoIds }
      )
    }

    if (userIds.length > 0) {
      await session.run(
        `
        MATCH (u:User)
        WHERE u.id IN $userIds
        DETACH DELETE u
      `,
        { userIds }
      )
    }

    if (githubUserIds.length > 0) {
      await session.run(
        `
        MATCH (u:GithubUser)
        WHERE u.id IN $githubUserIds
        DETACH DELETE u
      `,
        { githubUserIds }
      )
    }

    if (commitShas.length > 0) {
      await session.run(
        `
        MATCH (c:Commit)
        WHERE c.sha IN $commitShas
        DETACH DELETE c
      `,
        { commitShas }
      )
    }
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
