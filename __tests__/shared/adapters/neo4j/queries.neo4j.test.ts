/**
 * Read-only integration tests for Neo4j query helpers
 *
 * These tests verify that the query helper functions work correctly
 * against a real Neo4j database with existing data.
 *
 * Setup:
 * 1. Ensure Neo4j test database is running
 * 2. Copy __tests__/.env.example to __tests__/.env and configure test database credentials
 *    IMPORTANT: Use a separate test database, not production!
 * 3. Ensure your test database has workflow runs with relationships
 *
 * Run with: pnpm test:neo4j
 */

import {
  listByUser,
  listEventsForWorkflowRun,
  listForIssue,
  listForRepo,
  mapListByUser,
  mapListEvents,
  mapListForIssue,
} from "@/shared/adapters/neo4j/queries/workflowRuns"

import { createTestDataSource, verifyConnection } from "./testUtils"

describe("Neo4j Query Helpers - Read Operations", () => {
  let dataSource: ReturnType<typeof createTestDataSource>

  beforeAll(async () => {
    dataSource = createTestDataSource()
    await verifyConnection(dataSource)
  })

  afterAll(async () => {
    await dataSource.getDriver().close()
  })

  describe("listByUser", () => {
    it("should execute query without errors for non-existent user", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) => {
          return listByUser(tx, {
            user: { id: "non-existent-user-123" },
          })
        })

        expect(result.records).toEqual([])
      } finally {
        await session.close()
      }
    })

    it("should retrieve workflow runs if user exists", async () => {
      const session = dataSource.getSession("READ")
      try {
        // First, find a user who has initiated workflow runs
        const userQuery = await session.run(`
          MATCH (wr:WorkflowRun)-[:INITIATED_BY]->(u:User)
          RETURN u.id AS userId
          LIMIT 1
        `)

        if (userQuery.records.length === 0) {
          console.log(
            "⚠️  No workflow runs initiated by users found. Skipping test."
          )
          return
        }

        const userId = userQuery.records[0].get("userId") as string

        // Now test the listByUser query
        const result = await session.executeRead((tx) => {
          return listByUser(tx, {
            user: { id: userId },
          })
        })

        expect(result).toBeDefined()

        // Test mapper
        const mapped = mapListByUser(result)
        expect(mapped.length).toBeGreaterThan(0)
        expect(mapped[0]).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          createdAt: expect.any(Date),
          postToGithub: expect.any(Boolean),
          state: expect.stringMatching(
            /^(pending|running|completed|error|timedOut)$/
          ),
          actor: { type: "user" },
        })

        // Check commit field if present
        if (mapped[0].commit) {
          expect(mapped[0].commit).toMatchObject({
            sha: expect.any(String),
            message: expect.any(String),
            repository: {
              fullName: expect.any(String),
            },
          })
        }

        console.log(`✓ Found ${mapped.length} workflow runs for user ${userId}`)
      } finally {
        await session.close()
      }
    })

    it("should handle mapper with various record shapes", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead(async (tx) => {
          return await listByUser(tx, {
            user: { id: "any-user" },
          })
        })

        // Mapper should handle empty results
        const mapped = mapListByUser(result)
        expect(Array.isArray(mapped)).toBe(true)
      } finally {
        await session.close()
      }
    })
  })

  describe("listForIssue", () => {
    it("should execute query without errors for non-existent issue", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead(async (tx) => {
          return await listForIssue(tx, {
            issue: { number: 99999, repoFullName: "owner/repo" },
          })
        })

        expect(result.records).toEqual([])
      } finally {
        await session.close()
      }
    })

    it("should retrieve workflow runs if issue exists", async () => {
      const session = dataSource.getSession("READ")
      try {
        // First, find an issue that has workflow runs
        const issueQuery = await session.run(`
          MATCH (wr:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue)
          RETURN i.number AS number, i.repoFullName AS repoFullName
          LIMIT 1
        `)

        if (issueQuery.records.length === 0) {
          console.log(
            "⚠️  No workflow runs based on issues found. Skipping test."
          )
          return
        }

        const issueNumber = issueQuery.records[0].get("number").toNumber()
        const repoFullName = issueQuery.records[0].get("repoFullName") as string

        // Now test the listForIssue query
        const result = await session.executeRead(async (tx) => {
          return await listForIssue(tx, {
            issue: { number: issueNumber, repoFullName },
          })
        })

        expect(result.records.length).toBeGreaterThan(0)

        // Test mapper
        const mapped = mapListForIssue(result)
        expect(mapped.length).toBeGreaterThan(0)
        expect(mapped[0]).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          createdAt: expect.any(Date),
          state: expect.stringMatching(
            /^(pending|running|completed|error|timedOut)$/
          ),
        })

        // Check commit field if present
        if (mapped[0].commit) {
          expect(mapped[0].commit).toMatchObject({
            sha: expect.any(String),
            message: expect.any(String),
            repository: {
              fullName: expect.any(String),
            },
          })
        }

        console.log(
          `✓ Found ${mapped.length} workflow runs for issue #${issueNumber}`
        )
      } finally {
        await session.close()
      }
    })
  })

  describe("listForRepo", () => {
    it("should execute query without errors for non-existent repo", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead(async (tx) => {
          return await listForRepo(tx, {
            repo: { fullName: "owner/non-existent-repo" },
          })
        })

        expect(result.records).toEqual([])
      } finally {
        await session.close()
      }
    })

    it("should retrieve workflow runs if repository exists", async () => {
      const session = dataSource.getSession("READ")
      try {
        // First, find a repository that has workflow runs
        // Note: The query uses BASED_ON_REPOSITORY relationship
        const repoQuery = await session.run(`
          MATCH (wr:WorkflowRun)-[:BASED_ON_REPOSITORY]->(r:Repository)
          RETURN r.fullName AS fullName
          LIMIT 1
        `)

        if (repoQuery.records.length === 0) {
          console.log(
            "⚠️  No workflow runs with BASED_ON_REPOSITORY relationship found."
          )
          console.log(
            "   Note: This relationship may not exist yet in the current schema."
          )
          console.log("   The current PR uses TARGETS relationship instead.")
          return
        }

        const repoFullName = repoQuery.records[0].get("fullName") as string

        // Now test the listForRepo query
        const result = await session.executeRead(async (tx) => {
          return await listForRepo(tx, {
            repo: { fullName: repoFullName },
          })
        })

        expect(result.records.length).toBeGreaterThan(0)

        console.log(
          `✓ Found ${result.records.length} workflow runs for repo ${repoFullName}`
        )
      } finally {
        await session.close()
      }
    })
  })

  describe("listEventsForWorkflowRun", () => {
    it("should execute query without errors for non-existent workflow run", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead(async (tx) => {
          return await listEventsForWorkflowRun(tx, {
            workflowRunId: "non-existent-run-123",
          })
        })

        expect(result.records).toEqual([])
      } finally {
        await session.close()
      }
    })

    it("should retrieve events if workflow run exists with events", async () => {
      const session = dataSource.getSession("READ")
      try {
        // First, find a workflow run that has events
        const runQuery = await session.run(`
          MATCH (wr:WorkflowRun)-[:STARTS_WITH|NEXT*]->(e:Event)
          RETURN wr.id AS runId, count(e) AS eventCount
          ORDER BY eventCount DESC
          LIMIT 1
        `)

        if (runQuery.records.length === 0) {
          console.log("⚠️  No workflow runs with events found. Skipping test.")
          return
        }

        const runId = runQuery.records[0].get("runId") as string
        const expectedCount = runQuery.records[0].get("eventCount").toNumber()

        // Now test the listEventsForWorkflowRun query
        const result = await session.executeRead(async (tx) => {
          return await listEventsForWorkflowRun(tx, {
            workflowRunId: runId,
          })
        })

        expect(result.records.length).toBeGreaterThan(0)

        // Test mapper
        const mapped = mapListEvents(result)
        expect(mapped.length).toBeGreaterThan(0)

        // Events have different timestamp types (Date for WorkflowEvent, string for MessageEvent)
        const firstEvent = mapped[0]
        expect(firstEvent).toHaveProperty("type")
        expect(firstEvent).toHaveProperty("timestamp")

        console.log(
          `✓ Found ${mapped.length} events for workflow run ${runId} (expected: ${expectedCount})`
        )
      } finally {
        await session.close()
      }
    })

    it("should return events in chronological order", async () => {
      const session = dataSource.getSession("READ")
      try {
        // Find a workflow run with multiple events
        const runQuery = await session.run(`
          MATCH (wr:WorkflowRun)-[:STARTS_WITH|NEXT*]->(e:Event)
          WITH wr, count(e) AS eventCount
          WHERE eventCount > 1
          RETURN wr.id AS runId
          LIMIT 1
        `)

        if (runQuery.records.length === 0) {
          console.log(
            "⚠️  No workflow runs with multiple events found. Skipping test."
          )
          return
        }

        const runId = runQuery.records[0].get("runId") as string

        const result = await session.executeRead(async (tx) => {
          return await listEventsForWorkflowRun(tx, {
            workflowRunId: runId,
          })
        })

        const mapped = mapListEvents(result)

        // Verify events are in chronological order (ascending)
        // Note: AllEvents has mixed timestamp types (Date | string), so we normalize to milliseconds
        for (let i = 1; i < mapped.length; i++) {
          const prevTime =
            typeof mapped[i - 1].timestamp === "string"
              ? new Date(mapped[i - 1].timestamp).getTime()
              : (mapped[i - 1].timestamp as Date).getTime()

          const currTime =
            typeof mapped[i].timestamp === "string"
              ? new Date(mapped[i].timestamp).getTime()
              : (mapped[i].timestamp as Date).getTime()

          expect(currTime).toBeGreaterThanOrEqual(prevTime)
        }

        console.log(
          `✓ Verified ${mapped.length} events are in chronological order`
        )
      } finally {
        await session.close()
      }
    })
  })

  describe("Query Performance", () => {
    it("should execute queries with reasonable performance", async () => {
      const session = dataSource.getSession("READ")
      try {
        const start = Date.now()

        // Run a sample query
        await session.run("MATCH (wr:WorkflowRun) RETURN count(wr) AS count")

        const duration = Date.now() - start

        expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
        console.log(`✓ Query completed in ${duration}ms`)
      } finally {
        await session.close()
      }
    })
  })
})
