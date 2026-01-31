/**
 * Integration tests for Workflow Runs Visibility
 *
 * These tests verify that workflow runs are only visible to the users who initiated them.
 * The visibility feature relies on the INITIATED_BY relationship between WorkflowRun and User.
 *
 * Setup:
 * 1. Ensure Neo4j test database is running
 * 2. Copy __tests__/.env.example to __tests__/.env and configure:
 *    - NEO4J_URI (e.g., bolt://localhost:7687)
 *    - NEO4J_USER (e.g., neo4j)
 *    - NEO4J_PASSWORD
 *    IMPORTANT: Use a separate test database, not production!
 *
 * Run with: pnpm test:neo4j visibility
 */

import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"

import { createTestDataSource, verifyConnection } from "./testUtils"

// Hardcoded test data IDs for idempotent testing
const TEST_DATA = {
  workflowRuns: [
    "test-visibility-user-a",
    "test-visibility-user-b",
    "test-visibility-no-actor",
    "test-visibility-webhook",
  ],
  users: ["visibility-test-user-a", "visibility-test-user-b"],
  githubUsers: ["visibility-test-github-sender"],
}

describe("Workflow Runs Visibility", () => {
  let dataSource: ReturnType<typeof createTestDataSource>
  let adapter: StorageAdapter

  beforeAll(async () => {
    dataSource = createTestDataSource()
    await verifyConnection(dataSource)
    adapter = new StorageAdapter(dataSource)

    // Clean up any existing test data before starting
    await cleanupTestData()
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
    // Close the driver
    await dataSource.getDriver().close()
  })

  /**
   * Cleanup function that only deletes our specific hardcoded test data
   */
  async function cleanupTestData() {
    const session = dataSource.getSession("WRITE")
    try {
      // Delete workflow runs
      await session.run(
        `
        MATCH (wr:WorkflowRun)
        WHERE wr.id IN $runIds
        DETACH DELETE wr
      `,
        { runIds: TEST_DATA.workflowRuns }
      )

      // Delete users
      await session.run(
        `
        MATCH (user:User)
        WHERE user.id IN $userIds
        DETACH DELETE user
      `,
        { userIds: TEST_DATA.users }
      )

      // Delete GitHub users
      await session.run(
        `
        MATCH (ghUser:GithubUser)
        WHERE ghUser.id IN $ghUserIds
        DETACH DELETE ghUser
      `,
        { ghUserIds: TEST_DATA.githubUsers }
      )
    } finally {
      await session.close()
    }
  }

  describe("listByUser filtering", () => {
    it("should only return runs initiated by the specified user", async () => {
      // Create run for user-a
      await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[0],
        type: "resolveIssue",
        actor: { type: "user", userId: TEST_DATA.users[0] },
      })

      // Create run for user-b
      await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[1],
        type: "resolveIssue",
        actor: { type: "user", userId: TEST_DATA.users[1] },
      })

      // List runs for user-a
      const runsForA = await adapter.workflow.run.list({
        userId: TEST_DATA.users[0],
      })

      // Should only see user-a's run
      expect(runsForA).toHaveLength(1)
      expect(runsForA[0].id).toBe(TEST_DATA.workflowRuns[0])
      expect(runsForA[0].actor?.type).toBe("user")
      if (runsForA[0].actor?.type === "user") {
        expect(runsForA[0].actor.userId).toBe(TEST_DATA.users[0])
      }
    })

    it("should return user-b's run when querying for user-b", async () => {
      // List runs for user-b (data created in previous test)
      const runsForB = await adapter.workflow.run.list({
        userId: TEST_DATA.users[1],
      })

      // Should only see user-b's run
      expect(runsForB).toHaveLength(1)
      expect(runsForB[0].id).toBe(TEST_DATA.workflowRuns[1])
      expect(runsForB[0].actor?.type).toBe("user")
      if (runsForB[0].actor?.type === "user") {
        expect(runsForB[0].actor.userId).toBe(TEST_DATA.users[1])
      }
    })

    it("should not return runs without INITIATED_BY relationship", async () => {
      // Create run without actor (simulates old data)
      await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[2],
        type: "resolveIssue",
        // No actor provided
      })

      // List runs for user-a
      const runs = await adapter.workflow.run.list({
        userId: TEST_DATA.users[0],
      })

      // Should not include the orphaned run
      const orphanedRun = runs.find(
        (r) => r.id === TEST_DATA.workflowRuns[2]
      )
      expect(orphanedRun).toBeUndefined()
    })

    it("should return empty array for user with no runs", async () => {
      const runs = await adapter.workflow.run.list({
        userId: "non-existent-user-visibility-test",
      })
      expect(runs).toEqual([])
    })
  })

  describe("StorageAdapter.workflow.run.list", () => {
    it("should filter by userId when provided", async () => {
      // Runs already created in previous tests
      const runs = await adapter.workflow.run.list({
        userId: TEST_DATA.users[0],
      })

      // All returned runs should have actor.userId === user-a
      runs.forEach((run) => {
        expect(run.actor?.type).toBe("user")
        if (run.actor?.type === "user") {
          expect(run.actor.userId).toBe(TEST_DATA.users[0])
        }
      })
    })

    it("should return empty array when no userId is provided", async () => {
      // When no userId filter is provided, we return empty (current behavior)
      const runs = await adapter.workflow.run.list({})
      expect(runs).toEqual([])
    })

    it("should return empty array when only repositoryId filter is provided", async () => {
      // When only repositoryId filter is provided (no userId), return empty
      // This is expected because our current implementation only supports userId filtering
      const runs = await adapter.workflow.run.list({ repositoryId: "some-repo" })
      expect(runs).toEqual([])
    })
  })

  describe("Webhook-initiated runs", () => {
    it("should not be visible via userId query (webhook uses GithubUser)", async () => {
      // Create a webhook-initiated run
      await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[3],
        type: "resolveIssue",
        actor: {
          type: "webhook",
          source: "github",
          event: "issues",
          action: "labeled",
          sender: {
            id: TEST_DATA.githubUsers[0],
            login: "test-sender",
          },
          installationId: "inst-visibility-test",
        },
      })

      // Webhook runs create INITIATED_BY to GithubUser, not User
      // So querying by userId won't find them (this is expected behavior for now)
      const runs = await adapter.workflow.run.list({
        userId: TEST_DATA.githubUsers[0],
      })

      // The webhook run should not appear because the query matches against User nodes,
      // not GithubUser nodes. This is the current expected behavior.
      const webhookRun = runs.find((r) => r.id === TEST_DATA.workflowRuns[3])
      expect(webhookRun).toBeUndefined()
    })
  })
})
