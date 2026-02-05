/**
 * Integration tests for Neo4j query helpers (read operations)
 *
 * This suite verifies the query helper functions using ONLY our wrapper
 * functions to set up and read data. We avoid writing raw Cypher in tests
 * to ensure we validate the same queries our app uses in production.
 *
 * Setup:
 * 1. Ensure Neo4j test database is running
 * 2. Copy __tests__/.env.example to __tests__/.env and configure test database credentials
 *    IMPORTANT: Use a separate test database, not production!
 *
 * Run with: pnpm test:neo4j
 */

import {
  createWorkflowRun,
  attachActor,
  attachIssue,
  attachRepository,
  addEvent,
  addWorkflowStateEvent,
  listByUser,
  listEventsForWorkflowRun,
  listForIssue,
  listForRepo,
  mapListByUser,
  mapListEvents,
  mapListForIssue,
} from "@/shared/adapters/neo4j/queries/workflowRuns"

import { cleanupTestData, createTestDataSource, verifyConnection } from "./testUtils"

describe("Neo4j Query Helpers - Read Operations", () => {
  let dataSource: ReturnType<typeof createTestDataSource>

  // Hardcoded test fixtures (idempotent)
  const FIXTURE = {
    userId: "test-queries-user-1",
    repo: { id: "test-queries-repo-1", owner: "test", name: "queries-repo" },
    issue: { number: 123, repoFullName: "test/queries-repo" },
    runs: {
      byUser: "test-queries-run-by-user",
      byIssue: "test-queries-run-by-issue",
      byRepo: "test-queries-run-by-repo",
      withEvents: "test-queries-run-with-events",
    },
  }

  beforeAll(async () => {
    dataSource = createTestDataSource()
    await verifyConnection(dataSource)

    // Create deterministic test data using wrapper functions only
    const session = dataSource.getSession("WRITE")
    try {
      await session.executeWrite(async (tx) => {
        // 1) Run for listByUser
        await createWorkflowRun(tx, {
          runId: FIXTURE.runs.byUser,
          type: "resolveIssue",
          postToGithub: false,
        })
        await attachActor(tx, {
          runId: FIXTURE.runs.byUser,
          actor: { actorType: "user", actorUserId: FIXTURE.userId },
        })
        // add state so mappers have a value
        await addWorkflowStateEvent(tx, {
          runId: FIXTURE.runs.byUser,
          eventId: `${FIXTURE.runs.byUser}-state`,
          state: "running",
          createdAt: new Date().toISOString(),
          content: "state: running",
        })

        // 2) Run for listForIssue
        await createWorkflowRun(tx, {
          runId: FIXTURE.runs.byIssue,
          type: "resolveIssue",
          postToGithub: false,
        })
        await attachIssue(tx, {
          runId: FIXTURE.runs.byIssue,
          issueNumber: FIXTURE.issue.number,
          repoFullName: FIXTURE.issue.repoFullName,
        })
        await addWorkflowStateEvent(tx, {
          runId: FIXTURE.runs.byIssue,
          eventId: `${FIXTURE.runs.byIssue}-state`,
          state: "completed",
          createdAt: new Date().toISOString(),
          content: "state: completed",
        })

        // 3) Run for listForRepo
        await createWorkflowRun(tx, {
          runId: FIXTURE.runs.byRepo,
          type: "resolveIssue",
          postToGithub: true,
        })
        await attachRepository(tx, {
          runId: FIXTURE.runs.byRepo,
          repoId: FIXTURE.repo.id,
          repoOwner: FIXTURE.repo.owner,
          repoName: FIXTURE.repo.name,
        })
        await addWorkflowStateEvent(tx, {
          runId: FIXTURE.runs.byRepo,
          eventId: `${FIXTURE.runs.byRepo}-state`,
          state: "pending",
          createdAt: new Date().toISOString(),
          content: "state: pending",
        })

        // 4) Run with events chain
        await createWorkflowRun(tx, {
          runId: FIXTURE.runs.withEvents,
          type: "resolveIssue",
          postToGithub: false,
        })
        // seed events with increasing timestamps
        const t0 = Date.now() - 10000
        await addWorkflowStateEvent(tx, {
          runId: FIXTURE.runs.withEvents,
          eventId: `${FIXTURE.runs.withEvents}-state-1`,
          state: "running",
          createdAt: new Date(t0).toISOString(),
        })
        await addEvent(tx, {
          runId: FIXTURE.runs.withEvents,
          eventId: `${FIXTURE.runs.withEvents}-status-1`,
          eventType: "status",
          content: "Event 1",
          createdAt: new Date(t0 + 1000).toISOString(),
        })
        await addEvent(tx, {
          runId: FIXTURE.runs.withEvents,
          eventId: `${FIXTURE.runs.withEvents}-status-2`,
          eventType: "status",
          content: "Event 2",
          createdAt: new Date(t0 + 2000).toISOString(),
        })
      })
    } finally {
      await session.close()
    }
  })

  afterAll(async () => {
    // Delete only the workflow runs created above (and related orphan nodes)
    await cleanupTestData(dataSource, Object.values(FIXTURE.runs))
    await dataSource.getDriver().close()
  })

  describe("listByUser", () => {
    it("should return workflow runs for a known user", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listByUser(tx, { user: { id: FIXTURE.userId } })
        )
        const mapped = mapListByUser(result)
        expect(mapped.length).toBeGreaterThan(0)
        const item = mapped.find((r) => r.id === FIXTURE.runs.byUser)
        expect(item).toBeDefined()
        expect(item).toMatchObject({
          id: FIXTURE.runs.byUser,
          type: expect.any(String),
          createdAt: expect.any(Date),
          state: expect.stringMatching(/^(pending|running|completed|error|timedOut)$/),
          actor: { type: "user", userId: FIXTURE.userId },
        })
      } finally {
        await session.close()
      }
    })

    it("should handle mapper with empty results", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listByUser(tx, { user: { id: "non-existent-user-123" } })
        )
        const mapped = mapListByUser(result)
        expect(Array.isArray(mapped)).toBe(true)
        expect(mapped.length).toBe(0)
      } finally {
        await session.close()
      }
    })
  })

  describe("listForIssue", () => {
    it("should return workflow runs for a known issue", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listForIssue(tx, { issue: FIXTURE.issue })
        )
        const mapped = mapListForIssue(result)
        expect(mapped.length).toBeGreaterThan(0)
        const item = mapped.find((r) => r.id === FIXTURE.runs.byIssue)
        expect(item).toBeDefined()
        expect(item).toMatchObject({
          id: FIXTURE.runs.byIssue,
          type: expect.any(String),
          createdAt: expect.any(Date),
          state: expect.stringMatching(/^(pending|running|completed|error|timedOut)$/),
        })
      } finally {
        await session.close()
      }
    })

    it("should return empty for non-existent issue", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listForIssue(tx, { issue: { number: 99999, repoFullName: "owner/repo" } })
        )
        expect(result.records).toEqual([])
      } finally {
        await session.close()
      }
    })
  })

  describe("listForRepo", () => {
    it("should return workflow runs for a known repository", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listForRepo(tx, { repo: { fullName: `${FIXTURE.repo.owner}/${FIXTURE.repo.name}` } })
        )
        expect(result.records.length).toBeGreaterThan(0)
      } finally {
        await session.close()
      }
    })

    it("should return empty for a non-existent repository", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listForRepo(tx, { repo: { fullName: "owner/non-existent-repo" } })
        )
        expect(result.records).toEqual([])
      } finally {
        await session.close()
      }
    })
  })

  describe("listEventsForWorkflowRun", () => {
    it("should return events for a known workflow run in chronological order", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listEventsForWorkflowRun(tx, { workflowRunId: FIXTURE.runs.withEvents })
        )
        const mapped = mapListEvents(result)
        expect(mapped.length).toBeGreaterThanOrEqual(2)

        // Verify chronological order
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
      } finally {
        await session.close()
      }
    })

    it("should return empty for a non-existent workflow run", async () => {
      const session = dataSource.getSession("READ")
      try {
        const result = await session.executeRead((tx) =>
          listEventsForWorkflowRun(tx, { workflowRunId: "non-existent-run-123" })
        )
        expect(result.records).toEqual([])
      } finally {
        await session.close()
      }
    })
  })

  describe("Query Performance", () => {
    it("should execute helper queries with reasonable performance", async () => {
      const session = dataSource.getSession("READ")
      try {
        const start = Date.now()
        // Run a sample helper query (non-existent user)
        await session.executeRead((tx) =>
          listByUser(tx, { user: { id: "non-existent-user-perf" } })
        )
        const duration = Date.now() - start
        expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      } finally {
        await session.close()
      }
    })
  })
})

