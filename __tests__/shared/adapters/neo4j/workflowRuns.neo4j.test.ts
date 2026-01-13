/**
 * Integration tests for Workflow Runs in Neo4j
 *
 * These tests verify that workflow runs can be created with minimal data
 * and metadata can be attached progressively using handle methods:
 * - handle.attach.repository()
 * - handle.attach.issue()
 * - handle.attach.actor()
 * - handle.attach.commit()
 * - handle.add.event()
 *
 * Setup:
 * 1. Ensure Neo4j test database is running
 * 2. Copy __tests__/.env.example to __tests__/.env and configure:
 *    - NEO4J_URI (e.g., bolt://localhost:7687)
 *    - NEO4J_USER (e.g., neo4j)
 *    - NEO4J_PASSWORD
 *    IMPORTANT: Use a separate test database, not production!
 *
 * Run with: pnpm test:neo4j
 */

import { int } from "neo4j-driver"

import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"

import { createTestDataSource, verifyConnection } from "./testUtils"

// Hardcoded test data IDs for idempotent testing
const TEST_DATA = {
  workflowRuns: [
    "test-workflow-run-minimal",
    "test-workflow-run-full",
    "test-workflow-run-events",
    "test-workflow-run-step-by-step",
    "test-workflow-run-backward-compat",
  ],
  repositories: ["test-prog-repo-1", "test-prog-repo-2"],
  users: ["test-prog-user-1"],
  githubUsers: ["test-prog-github-user-1"],
  commits: ["test-prog-commit-1"],
  issues: [
    { number: 42, repoFullName: "test/repo" },
    { number: 100, repoFullName: "test/prog-repo-2" },
  ],
}

describe("Workflow Runs Tests", () => {
  let dataSource: ReturnType<typeof createTestDataSource>
  let adapter: StorageAdapter

  beforeAll(async () => {
    dataSource = createTestDataSource()
    await verifyConnection(dataSource)
    adapter = new StorageAdapter(dataSource)

    // Clean up any existing test data before starting
    await cleanupHardcodedTestData()
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupHardcodedTestData()
    // Close the driver
    await dataSource.getDriver().close()
  })

  /**
   * Cleanup function that only deletes our specific hardcoded test data
   */
  async function cleanupHardcodedTestData() {
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

      // Delete repositories
      await session.run(
        `
        MATCH (repo:Repository)
        WHERE repo.id IN $repoIds
        DETACH DELETE repo
      `,
        { repoIds: TEST_DATA.repositories }
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

      // Delete commits
      await session.run(
        `
        MATCH (commit:Commit)
        WHERE commit.sha IN $commitShas
        DETACH DELETE commit
      `,
        { commitShas: TEST_DATA.commits }
      )

      // Delete issues
      for (const issue of TEST_DATA.issues) {
        await session.run(
          `
          MATCH (issue:Issue {number: $number, repoFullName: $repoFullName})
          DETACH DELETE issue
        `,
          { number: int(issue.number), repoFullName: issue.repoFullName }
        )
      }

      // Delete events
      await session.run(
        `
        MATCH (event:Event)
        WHERE event.id STARTS WITH 'test-prog-'
        DETACH DELETE event
      `
      )
    } finally {
      await session.close()
    }
  }

  describe("Minimal workflow run creation", () => {
    it("should create workflow run with only type", async () => {
      const handle = await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[0],
        type: "resolveIssue",
      })

      expect(handle.run.id).toBe(TEST_DATA.workflowRuns[0])
      expect(handle.run.type).toBe("resolveIssue")
      expect(handle.run.state).toBe("pending")

      // Verify only WorkflowRun node exists, no relationships
      const session = dataSource.getSession("READ")
      try {
        const result = await session.run(
          `
          MATCH (wr:WorkflowRun {id: $id})
          RETURN
            COUNT { (wr)-[:BASED_ON_REPOSITORY]->() } AS repoCount,
            COUNT { (wr)-[:BASED_ON_ISSUE]->() } AS issueCount,
            COUNT { (wr)-[:INITIATED_BY]->() } AS actorCount
        `,
          { id: handle.run.id }
        )

        const record = result.records[0]
        const repoCount = record?.get("repoCount")
        const issueCount = record?.get("issueCount")
        const actorCount = record?.get("actorCount")

        // COUNT {} returns Neo4j Integer, convert to number
        expect(
          typeof repoCount === "number" ? repoCount : repoCount?.toNumber()
        ).toBe(0)
        expect(
          typeof issueCount === "number" ? issueCount : issueCount?.toNumber()
        ).toBe(0)
        expect(
          typeof actorCount === "number" ? actorCount : actorCount?.toNumber()
        ).toBe(0)
      } finally {
        await session.close()
      }
    })

    it("should auto-generate UUID if id not provided", async () => {
      const handle = await adapter.workflow.run.create({
        type: "resolveIssue",
      })

      expect(handle.run.id).toBeDefined()
      expect(handle.run.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )

      // Cleanup
      const session = dataSource.getSession("WRITE")
      try {
        await session.run(
          `
          MATCH (wr:WorkflowRun {id: $id})
          DETACH DELETE wr
        `,
          { id: handle.run.id }
        )
      } finally {
        await session.close()
      }
    })
  })

  describe("Progressive attachment via handle methods", () => {
    it("should attach repository after creation", async () => {
      const handle = await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[1],
        type: "resolveIssue",
      })

      // Attach repository
      await handle.attach.repository({
        id: 12345,
        fullName: "test/prog-repo-1",
        owner: "test",
        name: "prog-repo-1",
        githubInstallationId: "inst-123",
      })

      // Verify repository relationship exists
      const retrieved = await adapter.workflow.run.getById(handle.run.id)
      expect(retrieved?.repository?.fullName).toBe("test/prog-repo-1")
    })

    it("should attach issue after creation", async () => {
      const handle = await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[2],
        type: "resolveIssue",
      })

      // Attach issue
      await handle.attach.issue({
        number: 42,
        repoFullName: "test/repo",
      })

      // Verify issue relationship exists
      const retrieved = await adapter.workflow.run.getById(handle.run.id)
      expect(retrieved?.issue?.number).toBe(42)
    })

    it("should attach actor after creation", async () => {
      const handle = await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[3],
        type: "resolveIssue",
      })

      // Attach user actor
      await handle.attach.actor({
        type: "user",
        userId: TEST_DATA.users[0],
      })

      // Verify actor relationship exists
      const retrieved = await adapter.workflow.run.getById(handle.run.id)
      expect(retrieved?.actor?.type).toBe("user")
    })

    it("should attach metadata step-by-step", async () => {
      const handle = await adapter.workflow.run.create({
        id: TEST_DATA.workflowRuns[4],
        type: "resolveIssue",
      })

      // Step 1: Attach repository
      await handle.attach.repository({
        id: 67890,
        fullName: "test/prog-repo-2",
        owner: "test",
        name: "prog-repo-2",
      })

      // Step 2: Attach issue
      await handle.attach.issue({
        number: 100,
        repoFullName: "test/prog-repo-2",
      })

      // Step 3: Attach actor
      await handle.attach.actor({
        type: "webhook",
        source: "github",
        event: "issues",
        action: "opened",
        sender: {
          id: TEST_DATA.githubUsers[0],
          login: "testuser",
        },
        installationId: "inst-456",
      })

      // Step 4: Attach commit
      await handle.attach.commit({
        sha: TEST_DATA.commits[0],
        message: "Fix issue",
      })

      // Verify all relationships exist
      const retrieved = await adapter.workflow.run.getById(handle.run.id)
      expect(retrieved?.repository?.fullName).toBe("test/prog-repo-2")
      expect(retrieved?.issue?.number).toBe(100)
      expect(retrieved?.actor?.type).toBe("webhook")
      expect(retrieved?.commit?.sha).toBe(TEST_DATA.commits[0])

      // Verify commit is linked to repository
      const session = dataSource.getSession("READ")
      try {
        const result = await session.run(
          `
          MATCH (commit:Commit {sha: $commitSha})-[:IN_REPOSITORY]->(repo:Repository)
          RETURN repo.fullName AS repoFullName
        `,
          { commitSha: TEST_DATA.commits[0] }
        )

        expect(result.records[0]?.get("repoFullName")).toBe("test/prog-repo-2")
      } finally {
        await session.close()
      }
    })
  })

  describe("Event chaining", () => {
    it("should chain events in order via handle.add.event", async () => {
      const handle = await adapter.workflow.run.create({
        type: "resolveIssue",
      })

      // Add first event
      await handle.add.event({
        type: "status",
        payload: { content: "Event 1" },
      })

      // Add second event
      await handle.add.event({
        type: "status",
        payload: { content: "Event 2" },
      })

      // Add third event
      await handle.add.event({
        type: "status",
        payload: { content: "Event 3" },
      })

      // Verify events are in order
      const events = await adapter.workflow.events.list(handle.run.id)
      expect(events.length).toBeGreaterThanOrEqual(3)

      // Cleanup
      const session = dataSource.getSession("WRITE")
      try {
        await session.run(
          `
          MATCH (wr:WorkflowRun {id: $id})
          DETACH DELETE wr
        `,
          { id: handle.run.id }
        )
      } finally {
        await session.close()
      }
    })
  })

  describe("Return handle methods", () => {
    it("should return handle with all attach methods", async () => {
      const handle = await adapter.workflow.run.create({
        type: "resolveIssue",
      })

      // Verify handle has all expected methods
      expect(handle.run).toBeDefined()
      expect(handle.add.event).toBeInstanceOf(Function)
      expect(handle.attach.target).toBeInstanceOf(Function)
      expect(handle.attach.actor).toBeInstanceOf(Function)
      expect(handle.attach.repository).toBeInstanceOf(Function)
      expect(handle.attach.issue).toBeInstanceOf(Function)
      expect(handle.attach.commit).toBeInstanceOf(Function)

      // Cleanup
      const session = dataSource.getSession("WRITE")
      try {
        await session.run(
          `
          MATCH (wr:WorkflowRun {id: $id})
          DETACH DELETE wr
        `,
          { id: handle.run.id }
        )
      } finally {
        await session.close()
      }
    })
  })
})
