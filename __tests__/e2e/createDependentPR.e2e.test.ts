/**
 * Queue Infrastructure Integration Tests: @issuetopr PR Comment Workflow
 *
 * CURRENT SCOPE (what these tests actually verify):
 * - Redis/BullMQ connectivity and job enqueueing
 * - Mock workers can pick up and process jobs
 * - Neo4j database connectivity and user settings storage
 * - Webhook signature generation
 *
 * LIMITATIONS - TRUE E2E TESTING NOT YET IMPLEMENTED:
 * TODO: These tests use MOCK workers that return immediately. They do NOT:
 * - Run the actual createDependentPR workflow (which takes up to 10 minutes)
 * - Connect to a real GitHub repository with the dev app installed
 * - Verify that the AI agent actually pushes changes to a PR
 * - Use real GitHub API calls or webhook delivery
 *
 * TODO: For true e2e testing, we need:
 * 1. A real test GitHub repository with the dev GitHub app installed
 * 2. A real test PR that the workflow can modify
 * 3. Environment variables: TEST_GITHUB_REPO, TEST_PR_NUMBER, TEST_GITHUB_USER
 * 4. Much longer timeouts (10-15 minutes instead of 15-30 seconds)
 * 5. Polling for actual workflow completion status
 * 6. Verification via GitHub API that changes were pushed to the PR
 *
 * Prerequisites:
 * - Start e2e services: pnpm test:e2e:up
 * - Copy __tests__/.env.e2e.example to __tests__/.env.e2e
 *
 * Run with: pnpm test:e2e
 * Or all-in-one: pnpm test:e2e:run
 */

import { Queue, QueueEvents, Worker } from "bullmq"
import * as crypto from "crypto"
import * as dotenv from "dotenv"
import IORedis from "ioredis"
import * as path from "path"

// Load e2e-specific environment first
const e2eEnvPath = path.resolve(__dirname, "../.env.e2e")
dotenv.config({ path: e2eEnvPath })

// Now load fallback from __tests__/.env for Neo4j if not set
const testEnvPath = path.resolve(__dirname, "../.env")
dotenv.config({ path: testEnvPath })


// Queue name from env or default constant (for test isolation)
const QUEUE_NAME = process.env.BULLMQ_QUEUE_NAME

if (!QUEUE_NAME) {
  throw new Error("BULLMQ_QUEUE_NAME is not set")
}

// Create a fresh Redis connection for tests (not cached)
function createTestRedisConnection(redisUrl: string, name: string): IORedis {
  return new IORedis(redisUrl, {
    connectionName: `e2e-test:${name}`,
    maxRetriesPerRequest: null, // Required for BullMQ workers
  })
}

// Test constants
// TODO: These are FAKE values for queue infrastructure testing only.
// For true e2e tests, these should come from environment variables pointing to
// a real GitHub test repository with the dev app installed:
// - TEST_GITHUB_REPO: A real repo like "your-org/e2e-test-repo"
// - TEST_PR_NUMBER: A real PR number that can be modified by the workflow
// - TEST_GITHUB_USER: A real user with API key configured in Neo4j
// - TEST_INSTALLATION_ID: The real GitHub app installation ID
const TEST_USER_LOGIN = "e2e-test-user"
const TEST_REPO = "test-owner/test-repo"
const TEST_PR_NUMBER = 999
const TEST_INSTALLATION_ID = 12345678
const _TEST_COMMENT_ID = 87654321 // Reserved for future webhook e2e tests
const TEST_API_KEY = "sk-test-e2e-api-key-12345"

// Helper to create signed webhook payload
function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(payload)
  return `sha256=${hmac.digest("hex")}`
}

// Helper to wait for condition with timeout (polling approach)
// TODO: For true e2e tests with real workflow execution:
// - timeoutMs should be 600000+ (10+ minutes) since workflows can take that long
// - condition should check actual workflow status in database or job state
// - Consider adding progress reporting for long-running tests
async function waitFor(
  condition: () => Promise<boolean>,
  timeoutMs: number = 10000,
  intervalMs: number = 100
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return true
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return false
}

describe("E2E: @issuetopr PR Comment Workflow", () => {
  // Skip if required env vars are not set
  const requiredEnvVars = [
    "REDIS_URL",
    "NEO4J_URI",
    "NEO4J_USER",
    "NEO4J_PASSWORD",
    "GITHUB_WEBHOOK_SECRET",
  ]

  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v])

  if (missingEnvVars.length > 0) {
    console.warn(
      `⚠️  Skipping E2E tests: Missing env vars: ${missingEnvVars.join(", ")}\n` +
      "Copy __tests__/.env.e2e.example to __tests__/.env.e2e and configure.\n" +
      "Start e2e services with: pnpm test:e2e:up"
    )

    it.skip("E2E tests require environment configuration", () => { })
    return
  }

  const REDIS_URL = process.env.REDIS_URL!
  const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!

  let queue: Queue
  let queueEvents: QueueEvents
  let redisConnection: IORedis
  let eventsConnection: IORedis
  const testJobIds: string[] = []

  beforeAll(async () => {
    // Set up queue and events connection using fresh connections
    redisConnection = createTestRedisConnection(REDIS_URL, "queue")
    eventsConnection = createTestRedisConnection(REDIS_URL, "events")
    queue = new Queue(QUEUE_NAME, { connection: redisConnection })
    queueEvents = new QueueEvents(QUEUE_NAME, {
      connection: eventsConnection,
    })

    // Wait for connections
    await new Promise((resolve) => setTimeout(resolve, 500))
  })

  afterAll(async () => {
    // Clean up test jobs from queue
    if (queue) {
      for (const jobId of testJobIds) {
        try {
          const job = await queue.getJob(jobId)
          if (job) {
            await job.remove()
          }
        } catch {
          // Job may already be processed or removed
        }
      }
      await queue.close()
    }

    if (queueEvents) {
      await queueEvents.close()
    }

    if (eventsConnection) {
      await eventsConnection.quit()
    }

    if (redisConnection) {
      await redisConnection.quit()
    }
  })

  // NOTE: Webhook handler early-exit tests are in unit tests at:
  // __tests__/lib/webhook/handlers/pullRequest/comment.authorizeWorkflow.handler.test.ts
  // E2E tests focus on queue/worker/database integration.

  describe("Job Enqueueing", () => {
    it("should add a job to the queue when called directly", async () => {
      const { addJob } = await import("@/shared/services/job")

      const workflowId = `e2e-test-${Date.now()}`
      const jobId = await addJob(
        QUEUE_NAME,
        {
          name: "createDependentPR",
          data: {
            workflowId,
            repoFullName: TEST_REPO,
            pullNumber: TEST_PR_NUMBER,
            githubLogin: TEST_USER_LOGIN,
            githubInstallationId: String(TEST_INSTALLATION_ID),
          },
        },
        {},
        REDIS_URL
      )

      expect(jobId).toBeDefined()
      if (!jobId) throw new Error("jobId should be defined")
      testJobIds.push(jobId)

      // Verify job exists in queue
      const job = await queue.getJob(jobId)
      expect(job).not.toBeNull()
      expect(job?.name).toBe("createDependentPR")
      expect(job?.data.workflowId).toBe(workflowId)
      expect(job?.data.repoFullName).toBe(TEST_REPO)
    })
  })

  describe("Worker Processing", () => {
    // Each test creates its own worker to avoid race conditions
    //
    // TODO: These tests use MOCK workers that just validate job data and return immediately.
    // They do NOT run the actual createDependentPR workflow. For true e2e testing:
    // - Import and use the real workflow processor from apps/workers/workflow-workers
    // - Increase timeout from 15s to 10+ minutes
    // - Verify actual GitHub PR changes after workflow completion

    it("should pick up and process a createDependentPR job", async () => {
      const { addJob } = await import("@/shared/services/job")

      const testId = `worker-test-${Date.now()}`
      const workflowId = `e2e-${testId}`

      // Create own connections (like Full Integration Flow test)
      const queueConnection = createTestRedisConnection(REDIS_URL, `queue-${testId}`)
      const workerConnection = createTestRedisConnection(REDIS_URL, `worker-${testId}`)

      // Create own queue and drain stale jobs
      const testQueue = new Queue(QUEUE_NAME, { connection: queueConnection })
      await testQueue.drain()

      let processedJobId: string | null = null
      let jobError: string | null = null

      // TODO: This is a MOCK worker that just validates data and returns immediately.
      // For true e2e, replace with the real workflow processor that:
      // - Calls GitHub API to fetch PR details
      // - Runs the AI agent to analyze and create dependent PR
      // - Pushes changes to GitHub (takes up to 10 minutes)
      const worker = new Worker(
        QUEUE_NAME,
        async (job) => {
          processedJobId = job.id!
          const { workflowId, repoFullName, pullNumber, githubLogin } = job.data
          if (!workflowId) throw new Error("Missing workflowId")
          if (!repoFullName) throw new Error("Missing repoFullName")
          if (!pullNumber) throw new Error("Missing pullNumber")
          if (!githubLogin) throw new Error("Missing githubLogin")
          return `E2E test: processed ${repoFullName}#${pullNumber}`
        },
        { connection: workerConnection, concurrency: 1 }
      )

      worker.on("failed", (job, err) => {
        if (job?.id) jobError = err.message
      })

      // Wait for worker to be ready
      await new Promise<void>((resolve) => worker.on("ready", resolve))

      // Now add the job
      const jobId = await addJob(
        QUEUE_NAME,
        {
          name: "createDependentPR",
          data: {
            workflowId,
            repoFullName: TEST_REPO,
            pullNumber: TEST_PR_NUMBER,
            githubLogin: TEST_USER_LOGIN,
            githubInstallationId: String(TEST_INSTALLATION_ID),
          },
        },
        {},
        REDIS_URL
      )
      if (!jobId) throw new Error("jobId should be defined")
      testJobIds.push(jobId)

      // Wait for processing
      const wasProcessed = await waitFor(
        async () => processedJobId === jobId,
        15000
      )

      // Cleanup
      await worker.close()
      await testQueue.close()
      await workerConnection.quit()
      await queueConnection.quit()

      expect(wasProcessed).toBe(true)
      expect(jobError).toBeNull()
    })

    it("should validate job data and reject invalid jobs", async () => {
      const { addJob } = await import("@/shared/services/job")

      const testId = `invalid-test-${Date.now()}`
      const workflowId = `e2e-${testId}`

      // Create own connections (like Full Integration Flow test)
      const queueConnection = createTestRedisConnection(REDIS_URL, `queue-${testId}`)
      const workerConnection = createTestRedisConnection(REDIS_URL, `worker-${testId}`)

      // Create own queue and drain stale jobs
      const testQueue = new Queue(QUEUE_NAME, { connection: queueConnection })
      await testQueue.drain()

      let processedJobId: string | null = null
      let jobError: string | null = null

      const worker = new Worker(
        QUEUE_NAME,
        async (job) => {
          processedJobId = job.id!
          const { workflowId, repoFullName, pullNumber, githubLogin } = job.data
          if (!workflowId) throw new Error("Missing workflowId")
          if (!repoFullName) throw new Error("Missing repoFullName")
          if (!pullNumber) throw new Error("Missing pullNumber")
          if (!githubLogin) throw new Error("Missing githubLogin")
          return `Processed`
        },
        { connection: workerConnection, concurrency: 1 }
      )

      worker.on("failed", (job, err) => {
        processedJobId = job?.id || null
        jobError = err.message
      })

      // Wait for worker to be ready
      await new Promise<void>((resolve) => worker.on("ready", resolve))

      // Add job with empty githubLogin (no retries to ensure immediate failure)
      const jobId = await addJob(
        QUEUE_NAME,
        {
          name: "createDependentPR",
          data: {
            workflowId,
            repoFullName: TEST_REPO,
            pullNumber: TEST_PR_NUMBER,
            githubLogin: "", // Invalid
            githubInstallationId: String(TEST_INSTALLATION_ID),
          },
        },
        { attempts: 1 },
        REDIS_URL
      )
      if (!jobId) throw new Error("jobId should be defined")
      testJobIds.push(jobId)

      // Wait for processing or failure
      const wasProcessed = await waitFor(
        async () => processedJobId === jobId,
        15000
      )

      // Cleanup
      await worker.close()
      await testQueue.close()
      await workerConnection.quit()
      await queueConnection.quit()

      expect(wasProcessed).toBe(true)
      expect(jobError).toContain("Missing githubLogin")
    })
  })

  describe("Webhook Payload Signature", () => {
    it("should generate valid webhook signature", () => {
      const payload = JSON.stringify({
        action: "created",
        issue: { number: 1, pull_request: {} },
        comment: {
          id: 123,
          body: "@issuetopr",
          user: { login: "test", type: "User" },
          author_association: "OWNER",
        },
        repository: { full_name: "owner/repo" },
        installation: { id: 999 },
      })

      const signature = signPayload(payload, WEBHOOK_SECRET)

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/)

      // Verify signature is correct
      const expectedHmac = crypto.createHmac("sha256", WEBHOOK_SECRET)
      expectedHmac.update(payload)
      expect(signature).toBe(`sha256=${expectedHmac.digest("hex")}`)
    })
  })
})

/**
 * Full Integration Flow Tests
 * These tests trace a job through the complete lifecycle
 *
 * TODO: Currently uses a MOCK processor that simulates progress updates.
 * For true e2e testing:
 * - Use the real workflow processor
 * - Increase timeout from 30s to 600000ms+ (10+ minutes)
 * - Add verification step to check GitHub API for actual PR changes
 * - Consider adding progress polling to report status during long runs
 */
describe("E2E: Full Integration Flow", () => {
  const requiredEnvVars = ["REDIS_URL"]
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v])

  if (missingEnvVars.length > 0) {
    it.skip("Full integration tests require all services", () => { })
    return
  }

  it("should trace a job from enqueueing to completion", async () => {
    const REDIS_URL = process.env.REDIS_URL!
    const { addJob } = await import("@/shared/services/job")

    // Create unique identifiers for this test
    const testId = `full-flow-${Date.now()}`
    const workflowId = `workflow-${testId}`

    // Create connections for queue management and worker
    const queueConnection = createTestRedisConnection(REDIS_URL, `full-flow-queue-${testId}`)
    const workerConnection = createTestRedisConnection(REDIS_URL, `full-flow-worker-${testId}`)

    // Create queue to drain stale jobs
    const testQueue = new Queue(QUEUE_NAME, { connection: queueConnection })
    await testQueue.drain()

    let worker: Worker | null = null

    // TODO: This is a MOCK processor that simulates progress in ~200ms.
    // For true e2e testing, import and use the real workflow processor:
    //   import { processCreateDependentPR } from "@/apps/workers/workflow-workers/..."
    // The real processor takes up to 10 minutes and makes actual GitHub API calls.
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        if (job.data.workflowId === workflowId) {
          // Simulate workflow execution stages (MOCK - completes in ~200ms)
          await job.updateProgress(10)
          await new Promise((r) => setTimeout(r, 100))

          await job.updateProgress(50)
          await new Promise((r) => setTimeout(r, 100))

          await job.updateProgress(100)
          return `Completed workflow ${workflowId}`
        }
        // Ignore jobs from other tests
        return `Ignored job: ${job.data.workflowId}`
      },
      { connection: workerConnection, concurrency: 1 }
    )

    // Wait for worker to be ready
    await new Promise<void>((resolve) => {
      worker!.on("ready", () => {
        console.log("[E2E Full Flow Worker] Worker is ready")
        resolve()
      })
    })

    const completionPromise = new Promise<string>((resolve, reject) => {
      worker!.on("completed", (job) => {
        if (job.data.workflowId === workflowId) {
          resolve(job.returnvalue as string)
        }
      })

      worker!.on("failed", (job, err) => {
        if (job?.data.workflowId === workflowId) {
          reject(err)
        }
      })

      // TODO: 30 second timeout is only suitable for mock processor.
      // For real workflow execution, increase to 600000ms+ (10+ minutes)
      setTimeout(() => {
        reject(new Error("Timeout waiting for job"))
      }, 30000)
    })

    // Enqueue the job
    const jobId = await addJob(
      QUEUE_NAME,
      {
        name: "createDependentPR",
        data: {
          workflowId,
          repoFullName: TEST_REPO,
          pullNumber: TEST_PR_NUMBER,
          githubLogin: TEST_USER_LOGIN,
          githubInstallationId: String(TEST_INSTALLATION_ID),
        },
      },
      {},
      REDIS_URL
    )

    expect(jobId).toBeDefined()

    // Wait for completion
    const result = await completionPromise
    expect(result).toBe(`Completed workflow ${workflowId}`)

    // TODO: For true e2e testing, add GitHub verification step here:
    // - Use GitHub API (via Octokit) to check that a new commit was pushed
    // - Verify the PR has new changes from the workflow
    // - Example: const commits = await octokit.pulls.listCommits({ owner, repo, pull_number })
    // - Assert: expect(commits.data.length).toBeGreaterThan(initialCommitCount)

    // Cleanup
    if (worker) {
      await worker.close()
    }
    await testQueue.close()
    await workerConnection.quit()
    await queueConnection.quit()
  })
})

/**
 * Database Integration Tests
 * These tests require Neo4j to be running and verify database interactions
 */
describe("E2E: Database Integration", () => {
  const requiredEnvVars = ["NEO4J_URI", "NEO4J_USER", "NEO4J_PASSWORD"]
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v])

  if (missingEnvVars.length > 0) {
    it.skip("Database tests require Neo4j configuration", () => { })
    return
  }

  // Import Neo4j utilities
  let dataSource: ReturnType<
    typeof import("@/shared/adapters/neo4j/dataSource").createNeo4jDataSource
  >
  let StorageAdapter: typeof import("@/shared/adapters/neo4j/StorageAdapter").StorageAdapter

  beforeAll(async () => {
    const { createNeo4jDataSource } = await import(
      "@/shared/adapters/neo4j/dataSource"
    )
    const storageModule = await import(
      "@/shared/adapters/neo4j/StorageAdapter"
    )
    StorageAdapter = storageModule.StorageAdapter

    dataSource = createNeo4jDataSource({
      uri: process.env.NEO4J_URI!,
      user: process.env.NEO4J_USER!,
      password: process.env.NEO4J_PASSWORD!,
    })
  })

  afterAll(async () => {
    // Clean up test user if created
    const session = dataSource.getSession("WRITE")
    try {
      await session.run(
        `MATCH (u:User {username: $username}) DETACH DELETE u`,
        { username: TEST_USER_LOGIN }
      )
    } finally {
      await session.close()
      await dataSource.getDriver().close()
    }
  })

  it("should return UserNotFound for non-existent user", async () => {
    const adapter = new StorageAdapter(dataSource)
    const result = await adapter.settings.user.getOpenAIKey(
      "non-existent-user-12345"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe("UserNotFound")
    }
  })

  it("should create a test user and retrieve API key", async () => {
    // Create test user with settings
    const session = dataSource.getSession("WRITE")
    try {
      await session.run(
        `
        MERGE (u:User {username: $username})
        MERGE (u)-[:HAS_SETTINGS]->(s:Settings)
        SET s.openAIApiKey = $apiKey
        `,
        { username: TEST_USER_LOGIN, apiKey: TEST_API_KEY }
      )
    } finally {
      await session.close()
    }

    // Verify we can retrieve the API key
    const adapter = new StorageAdapter(dataSource)
    const result = await adapter.settings.user.getOpenAIKey(TEST_USER_LOGIN)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(TEST_API_KEY)
    }
  })
})
