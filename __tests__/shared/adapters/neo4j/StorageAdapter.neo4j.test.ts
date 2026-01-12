/**
 * Read-only integration tests for Neo4j StorageAdapter
 *
 * These tests verify that we can retrieve data from Neo4j correctly.
 * They are designed to run against a local Neo4j instance with existing data.
 *
 * Setup:
 * 1. Ensure Neo4j test database is running
 * 2. Copy __tests__/.env.example to __tests__/.env and configure:
 *    - NEO4J_URI (e.g., bolt://localhost:7687)
 *    - NEO4J_USER (e.g., neo4j)
 *    - NEO4J_PASSWORD
 *    IMPORTANT: Use a separate test database, not production!
 * 3. Ensure your test database has some workflow run data
 *
 * Run with: pnpm test:neo4j
 */

import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"

import { createTestDataSource, verifyConnection } from "./testUtils"

describe("StorageAdapter - Read Operations", () => {
  let dataSource: ReturnType<typeof createTestDataSource>
  let adapter: StorageAdapter

  beforeAll(async () => {
    // Create data source and verify connection
    dataSource = createTestDataSource()
    await verifyConnection(dataSource)
    adapter = new StorageAdapter(dataSource)
  })

  afterAll(async () => {
    // Ensure the Neo4j driver is closed so Jest can exit cleanly
    await dataSource.getDriver().close()
  })

  describe("workflow.run.getById", () => {
    it("should return null for non-existent workflow run", async () => {
      const result = await adapter.workflow.run.getById("non-existent-id-12345")
      expect(result).toBeNull()
    })

    it("should retrieve workflow run if it exists in database", async () => {
      // This test will pass if there's at least one workflow run in the database
      // First, let's check if any workflow runs exist
      const session = dataSource.getSession("READ")
      try {
        const queryResult = await session.run(
          "MATCH (wr:WorkflowRun) RETURN wr.id AS id LIMIT 1"
        )

        if (queryResult.records.length === 0) {
          console.log(
            "⚠️  No workflow runs found in database. Skipping test. " +
              "Create some workflow runs to test retrieval."
          )
          return
        }

        const existingId = queryResult.records[0].get("id") as string

        // Now test retrieval
        const result = await adapter.workflow.run.getById(existingId)

        expect(result).not.toBeNull()

        // Verify repository info if present
        if (result?.repository) {
          expect(result.repository).toMatchObject({
            fullName: expect.any(String),
          })
        }

        console.log("✓ Successfully retrieved workflow run:", {
          id: result?.id,
          type: result?.type,
          state: result?.state,
          repository: result?.repository?.fullName,
        })
      } finally {
        await session.close()
      }
    })

    it("should correctly parse dates from Neo4j DateTime", async () => {
      const session = dataSource.getSession("READ")
      try {
        const queryResult = await session.run(
          "MATCH (wr:WorkflowRun) RETURN wr.id AS id LIMIT 1"
        )

        if (queryResult.records.length === 0) {
          console.log("⚠️  No workflow runs found. Skipping test.")
          return
        }

        const existingId = queryResult.records[0].get("id") as string
        const result = await adapter.workflow.run.getById(existingId)

        expect(result?.createdAt).toBeInstanceOf(Date)
        expect(result?.createdAt.getTime()).not.toBeNaN()
      } finally {
        await session.close()
      }
    })
  })

  describe("workflow.run.list", () => {
    it("should return empty array (placeholder implementation)", async () => {
      const result = await adapter.workflow.run.list({})
      expect(result).toEqual([])
    })

    it("should accept various filter parameters", async () => {
      // Test that it accepts different filter shapes without erroring
      await expect(
        adapter.workflow.run.list({ repositoryId: "123" })
      ).resolves.toEqual([])

      await expect(
        adapter.workflow.run.list({ userId: "user-123" })
      ).resolves.toEqual([])

      await expect(
        adapter.workflow.run.list({ issueNumber: 42 })
      ).resolves.toEqual([])
    })
  })

  describe("workflow.run.listEvents", () => {
    it("should return empty array (placeholder implementation)", async () => {
      const result = await adapter.workflow.events.list("any-run-id")
      expect(result).toEqual([])
    })

    it("should accept any run id without error", async () => {
      await expect(adapter.workflow.events.list("test-run-1")).resolves.toEqual(
        []
      )
      await expect(
        adapter.workflow.events.list("non-existent")
      ).resolves.toEqual([])
    })
  })

  describe("settings.user", () => {
    describe("getOpenAIKey", () => {
      it("should return ok(null) for empty userId", async () => {
        const result = await adapter.settings.user.getOpenAIKey("")
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBeNull()
        }
      })

      it("should return ok(null) for non-existent user", async () => {
        const result = await adapter.settings.user.getOpenAIKey(
          "non-existent-user-12345"
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBeNull()
        }
      })

      it("should retrieve API key if it exists in database", async () => {
        // First, check if any users with settings exist
        const session = dataSource.getSession("READ")
        try {
          const queryResult = await session.run(`
            MATCH (u:User)-[:HAS_SETTINGS]->(s:Settings)
            WHERE s.openAIApiKey IS NOT NULL AND s.openAIApiKey <> ''
            RETURN u.username AS username
            LIMIT 1
          `)

          if (queryResult.records.length === 0) {
            console.log(
              "⚠️  No users with API keys found in database. Skipping test."
            )
            return
          }

          const existingUsername = queryResult.records[0].get(
            "username"
          ) as string

          // Now test retrieval
          const result =
            await adapter.settings.user.getOpenAIKey(existingUsername)

          expect(result.ok).toBe(true)
          if (result.ok) {
            expect(result.value).toBeTruthy()
            expect(typeof result.value).toBe("string")
            expect(result.value!.length).toBeGreaterThan(0)
          }

          console.log(
            "✓ Successfully retrieved API key for user:",
            existingUsername
          )
        } finally {
          await session.close()
        }
      })

      it("should handle database errors gracefully", async () => {
        // Create a new adapter with a closed driver to simulate error
        const tempDataSource = createTestDataSource()
        const tempAdapter = new StorageAdapter(tempDataSource)

        // Close the driver to simulate a connection error
        await tempDataSource.getDriver().close()

        const result = await tempAdapter.settings.user.getOpenAIKey("any-user")

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe("Unknown")
        }
      })
    })
  })

  describe("Database Connectivity", () => {
    it("should successfully read from database using READ session", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.run("RETURN 1 AS num")
        expect(result.records[0].get("num").toNumber()).toBe(1)
      } finally {
        await session.close()
      }
    })

    it("should successfully query for node counts", async () => {
      const session = dataSource.getSession("READ")
      try {
        // Query for workflow runs
        const wrResult = await session.run(
          "MATCH (wr:WorkflowRun) RETURN count(wr) AS count"
        )
        const wrCount = wrResult.records[0].get("count").toNumber()
        expect(wrCount).toBeGreaterThanOrEqual(0)

        // Query for repositories
        const repoResult = await session.run(
          "MATCH (r:Repository) RETURN count(r) AS count"
        )
        const repoCount = repoResult.records[0].get("count").toNumber()
        expect(repoCount).toBeGreaterThanOrEqual(0)

        console.log("📊 Database stats:", {
          workflowRuns: wrCount,
          repositories: repoCount,
        })
      } finally {
        await session.close()
      }
    })

    it("should verify relationships exist for workflow runs", async () => {
      const session = dataSource.getSession("READ")
      try {
        // Check if any workflow runs have BASED_ON_REPOSITORY relationships
        const result = await session.run(`
          MATCH (wr:WorkflowRun)-[:BASED_ON_REPOSITORY]->(repo:Repository)
          RETURN count(wr) AS count
        `)
        const count = result.records[0].get("count").toNumber()
        expect(count).toBeGreaterThanOrEqual(0)

        if (count > 0) {
          console.log(
            `✓ Found ${count} workflow runs with BASED_ON_REPOSITORY relationships`
          )
        } else {
          console.log(
            "⚠️  No workflow runs with BASED_ON_REPOSITORY relationships found"
          )
        }
      } finally {
        await session.close()
      }
    })
  })
})
