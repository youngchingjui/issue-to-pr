/**
 * E2E Test: Full Webhook-to-Workflow Integration
 *
 * This test verifies the complete flow:
 * GitHub webhook → authorization → Redis queue → worker → createDependentPR workflow → PR update
 *
 * IMPORTANT: This test runs the real AI workflow and may take up to 15 minutes.
 * It should be excluded from regular test runs and only run on specific CI triggers.
 *
 * Prerequisites:
 * 1. Copy __tests__/.env.e2e.example to __tests__/.env.e2e and configure all values
 * 2. Start E2E services: pnpm test:e2e:up
 * 3. Ensure no dev workers are running (they use different queue via BULLMQ_QUEUE_NAME)
 *
 * Run with: pnpm jest __tests__/e2e/webhook-to-workflow.e2e.test.ts --runInBand
 *
 * For real webhook tests via smee.io:
 * - Set SMEE_URL in your .env.e2e
 * - Run the test with: TEST_MODE=real-webhook pnpm test:e2e webhook-to-workflow
 */

import * as crypto from "crypto"
import * as dotenv from "dotenv"
import IORedis from "ioredis"
import * as path from "path"

import {
  createGitHubComment,
  deleteGitHubComment,
  type NextServerHandle,
  startNextServer,
  startSmee,
  type SmeeClientHandle,
  startWorker,
  type WorkerProcessHandle,
  waitForPRCondition,
} from "./helpers"

// Load e2e-specific environment first
const e2eEnvPath = path.resolve(__dirname, "../.env.e2e")
dotenv.config({ path: e2eEnvPath })

// Helper to create signed webhook payload
function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(payload)
  return `sha256=${hmac.digest("hex")}`
}

// Helper to poll Neo4j for workflow completion
async function waitForWorkflowCompletion(
  neo4jUri: string,
  neo4jUser: string,
  neo4jPassword: string,
  workflowId: string,
  timeoutMs: number = 900000, // 15 minutes
  pollIntervalMs: number = 30000 // 30 seconds
): Promise<{ completed: boolean; hasError: boolean; events: string[] }> {
  // Dynamic import to avoid issues with module resolution
  const neo4j = await import("neo4j-driver")

  const driver = neo4j.default.driver(
    neo4jUri,
    neo4j.default.auth.basic(neo4jUser, neo4jPassword)
  )

  const startTime = Date.now()

  try {
    while (Date.now() - startTime < timeoutMs) {
      const session = driver.session({ defaultAccessMode: neo4j.default.session.READ })

      try {
        // Query for workflow events
        const result = await session.run(
          `
          MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH|NEXT*]->(e:Event)
          RETURN e.type as eventType, e.createdAt as createdAt
          ORDER BY e.createdAt ASC
          `,
          { workflowId }
        )

        const events = result.records.map((r) => r.get("eventType") as string)

        // Check for completion or error
        const hasCompleted = events.includes("workflow.completed")
        const hasError = events.includes("workflow.error")

        if (hasCompleted || hasError) {
          return { completed: hasCompleted, hasError, events }
        }

        console.log(
          `[Neo4j Poll] Workflow ${workflowId} status: ` +
          `${events.length} events, last: ${events[events.length - 1] || "none"}`
        )
      } finally {
        await session.close()
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    // Timeout - return current state
    return { completed: false, hasError: false, events: [] }
  } finally {
    await driver.close()
  }
}

describe("E2E: Webhook to Workflow Integration", () => {
  // Required environment variables for the full E2E test
  const requiredEnvVars = [
    "REDIS_URL",
    "NEO4J_URI",
    "NEO4J_USER",
    "NEO4J_PASSWORD",
    "GITHUB_WEBHOOK_SECRET",
    "GITHUB_APP_ID",
    "GITHUB_APP_PRIVATE_KEY_PATH",
    "TEST_REPO_FULL_NAME",
    "TEST_PR_NUMBER",
    "TEST_GITHUB_USER",
    "TEST_INSTALLATION_ID",
    "OPENAI_API_KEY",
    "BULLMQ_QUEUE_NAME",
  ]

  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v])

  if (missingEnvVars.length > 0) {
    console.warn(
      `⚠️  Skipping full E2E webhook test: Missing env vars: ${missingEnvVars.join(", ")}\n` +
      "Copy __tests__/.env.e2e.example to __tests__/.env.e2e and configure.\n" +
      "Start e2e services with: pnpm test:e2e:up"
    )

    it.skip("Full E2E webhook test requires complete environment configuration", () => { })
    return
  }

  // Environment variables
  const REDIS_URL = process.env.REDIS_URL!
  const NEO4J_URI = process.env.NEO4J_URI!
  const NEO4J_USER = process.env.NEO4J_USER!
  const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD!
  const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!
  const GITHUB_APP_ID = process.env.GITHUB_APP_ID!
  const GITHUB_APP_PRIVATE_KEY_PATH = process.env.GITHUB_APP_PRIVATE_KEY_PATH!
  const TEST_REPO_FULL_NAME = process.env.TEST_REPO_FULL_NAME!
  const TEST_PR_NUMBER = parseInt(process.env.TEST_PR_NUMBER!, 10)
  const TEST_GITHUB_USER = process.env.TEST_GITHUB_USER!
  const TEST_INSTALLATION_ID = parseInt(process.env.TEST_INSTALLATION_ID!, 10)
  const BULLMQ_QUEUE_NAME = process.env.BULLMQ_QUEUE_NAME!

  // Process handles
  let workerHandle: WorkerProcessHandle | null = null
  let nextServerHandle: NextServerHandle | null = null
  let redisConnection: IORedis | null = null
  let smeeHandle: SmeeClientHandle | null = null

  // Track created comments for cleanup
  let createdCommentId: number | null = null

  // Timestamp for tracking when the test started (for filtering PR activity)
  let testStartTime: Date

  // Check if we're running in real webhook mode
  const USE_REAL_WEBHOOKS = process.env.TEST_MODE === "real-webhook" && process.env.SMEE_URL
  const SMEE_URL = process.env.SMEE_URL

  beforeAll(async () => {
    testStartTime = new Date()

    console.log("[E2E Setup] Starting test infrastructure...")
    console.log(`[E2E Setup] Queue name: ${BULLMQ_QUEUE_NAME}`)
    console.log(`[E2E Setup] Test repo: ${TEST_REPO_FULL_NAME}#${TEST_PR_NUMBER}`)
    console.log(`[E2E Setup] Mode: ${USE_REAL_WEBHOOKS ? "real webhooks via smee.io" : "mock webhooks"}`)

    // Environment variables to pass to spawned processes
    const e2eEnv: Record<string, string> = {
      REDIS_URL,
      NEO4J_URI,
      NEO4J_USER,
      NEO4J_PASSWORD,
      GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET,
      GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY_PATH,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
      BULLMQ_QUEUE_NAME,
      WORKER_CONCURRENCY: "1",
      SHUTDOWN_TIMEOUT_MS: "900000", // 15 min
    }

    // Start Next.js server
    console.log("[E2E Setup] Starting Next.js server...")
    nextServerHandle = await startNextServer({
      env: e2eEnv,
      port: 3001,
      readyTimeout: 60000,
    })
    console.log(`[E2E Setup] Next.js server ready at ${nextServerHandle.url}`)

    // Start smee client if using real webhooks
    if (USE_REAL_WEBHOOKS && SMEE_URL) {
      console.log("[E2E Setup] Starting smee client for webhook forwarding...")
      smeeHandle = await startSmee({
        smeeUrl: SMEE_URL,
        port: 3001,
        readyTimeout: 15000,
      })
      console.log(`[E2E Setup] Smee client ready, forwarding ${SMEE_URL} → ${smeeHandle.targetUrl}`)
    }

    // Start workflow worker
    console.log("[E2E Setup] Starting workflow worker...")
    workerHandle = await startWorker({
      env: e2eEnv,
      readyTimeout: 30000,
    })
    console.log("[E2E Setup] Workflow worker ready")

    // Connect to Redis for queue monitoring
    redisConnection = new IORedis(REDIS_URL, {
      connectionName: "e2e-webhook-test",
      maxRetriesPerRequest: null,
    })

    console.log("[E2E Setup] Infrastructure ready")
  }, 120000) // 2 minute setup timeout

  afterAll(async () => {
    console.log("[E2E Cleanup] Shutting down test infrastructure...")

    // Clean up created comment if any
    if (createdCommentId) {
      console.log(`[E2E Cleanup] Deleting test comment ${createdCommentId}...`)
      try {
        await deleteGitHubComment({
          appId: GITHUB_APP_ID,
          privateKeyPath: GITHUB_APP_PRIVATE_KEY_PATH,
          installationId: TEST_INSTALLATION_ID,
          repoFullName: TEST_REPO_FULL_NAME,
          commentId: createdCommentId,
        })
        console.log("[E2E Cleanup] Test comment deleted")
      } catch (err) {
        console.warn(`[E2E Cleanup] Failed to delete test comment: ${err}`)
      }
    }

    // Kill smee client
    if (smeeHandle) {
      console.log("[E2E Cleanup] Stopping smee client...")
      await smeeHandle.kill()
    }

    // Kill worker process
    if (workerHandle) {
      console.log("[E2E Cleanup] Stopping worker...")
      await workerHandle.kill()
    }

    // Kill Next.js server
    if (nextServerHandle) {
      console.log("[E2E Cleanup] Stopping Next.js server...")
      await nextServerHandle.kill()
    }

    // Close Redis connection
    if (redisConnection) {
      console.log("[E2E Cleanup] Closing Redis connection...")
      await redisConnection.quit()
    }

    console.log("[E2E Cleanup] Done")
  }, 30000)

  it("should process a PR comment webhook through the full workflow", async () => {
    if (USE_REAL_WEBHOOKS) {
      // ===== REAL WEBHOOK MODE =====
      // Create a real GitHub comment, which triggers a real webhook from GitHub
      console.log("[E2E Test] Creating real GitHub comment to trigger webhook...")

      const comment = await createGitHubComment({
        appId: GITHUB_APP_ID,
        privateKeyPath: GITHUB_APP_PRIVATE_KEY_PATH,
        installationId: TEST_INSTALLATION_ID,
        repoFullName: TEST_REPO_FULL_NAME,
        issueNumber: TEST_PR_NUMBER,
        body: `@issuetopr please process this PR (E2E test at ${new Date().toISOString()})`,
      })

      createdCommentId = comment.commentId
      console.log(`[E2E Test] Created comment ${comment.commentId}: ${comment.htmlUrl}`)
      console.log("[E2E Test] Waiting for GitHub to send webhook via smee.io...")

      // Give GitHub time to send the webhook (usually within 1-2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } else {
      // ===== MOCK WEBHOOK MODE =====
      // Construct webhook payload simulating a PR comment with @issuetopr
      const commentId = Date.now() // Unique comment ID

      const webhookPayload = {
        action: "created",
        issue: {
          number: TEST_PR_NUMBER,
          pull_request: {}, // Indicates this is a PR, not an issue
          author_association: "OWNER", // Required by schema
        },
        comment: {
          id: commentId,
          body: "@issuetopr please process this PR",
          user: {
            login: TEST_GITHUB_USER,
            type: "User",
          },
          author_association: "OWNER",
        },
        repository: {
          full_name: TEST_REPO_FULL_NAME,
        },
        installation: {
          id: TEST_INSTALLATION_ID,
        },
      }

      const payloadString = JSON.stringify(webhookPayload)
      const signature = signPayload(payloadString, WEBHOOK_SECRET)

      // Send webhook to the Next.js server
      console.log(`[E2E Test] Sending mock webhook to ${nextServerHandle!.url}/api/webhook/github`)

      const response = await fetch(`${nextServerHandle!.url}/api/webhook/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "issue_comment",
          "x-hub-signature-256": signature,
        },
        body: payloadString,
      })

      // The webhook handler returns 200 immediately and processes async
      expect(response.status).toBe(200)
      const responseText = await response.text()
      console.log(`[E2E Test] Webhook response: ${response.status} - ${responseText}`)
    }

    // Wait a moment for the job to be enqueued
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Find the workflow ID by looking for recent jobs in the queue
    // The handler creates a UUID for the workflow and enqueues it
    // We need to find it via Redis or by polling Neo4j for recent workflow runs

    // First, let's try to find a workflow run that was created for our repo/PR
    const neo4j = await import("neo4j-driver")
    const driver = neo4j.default.driver(
      NEO4J_URI,
      neo4j.default.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    )

    let workflowId: string | null = null

    // Poll for a workflow run that matches our test
    const findWorkflowStartTime = Date.now()
    const findWorkflowTimeout = 60000 // 1 minute to find the workflow

    while (Date.now() - findWorkflowStartTime < findWorkflowTimeout) {
      const session = driver.session({ defaultAccessMode: neo4j.default.session.READ })
      try {
        // Look for workflow runs targeting our repo/PR created after test started
        const result = await session.run(
          `
          MATCH (w:WorkflowRun)-[:TARGETS]->(r:Repository {fullName: $repoFullName})
          WHERE w.createdAt >= datetime($since)
          RETURN w.id as workflowId, w.createdAt as createdAt
          ORDER BY w.createdAt DESC
          LIMIT 1
          `,
          {
            repoFullName: TEST_REPO_FULL_NAME,
            since: testStartTime.toISOString(),
          }
        )

        if (result.records.length > 0) {
          workflowId = result.records[0].get("workflowId") as string
          console.log(`[E2E Test] Found workflow ID: ${workflowId}`)
          break
        }
      } finally {
        await session.close()
      }

      console.log("[E2E Test] Waiting for workflow to be created...")
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    await driver.close()

    // If we couldn't find a workflow via Neo4j, try to verify via PR activity instead
    if (!workflowId) {
      console.warn(
        "[E2E Test] Could not find workflow ID in Neo4j. " +
        "Verifying via GitHub PR activity instead."
      )
    }

    // Wait for workflow completion (or PR activity as fallback)
    console.log("[E2E Test] Waiting for workflow to complete (up to 15 minutes)...")

    if (workflowId) {
      // Poll Neo4j for workflow completion
      const workflowResult = await waitForWorkflowCompletion(
        NEO4J_URI,
        NEO4J_USER,
        NEO4J_PASSWORD,
        workflowId,
        900000, // 15 minutes
        30000 // 30 seconds
      )

      console.log(`[E2E Test] Workflow completion result:`, workflowResult)

      if (workflowResult.hasError) {
        console.error(`[E2E Test] Workflow failed with error. Events: ${workflowResult.events.join(", ")}`)
      }

      expect(workflowResult.completed || workflowResult.hasError).toBe(true)
      expect(workflowResult.hasError).toBe(false)
    }

    // Verify GitHub PR was modified
    console.log("[E2E Test] Verifying GitHub PR changes...")

    const prVerification = await waitForPRCondition(
      {
        appId: GITHUB_APP_ID,
        privateKeyPath: GITHUB_APP_PRIVATE_KEY_PATH,
        installationId: TEST_INSTALLATION_ID,
        repoFullName: TEST_REPO_FULL_NAME,
        pullNumber: TEST_PR_NUMBER,
        sinceTimestamp: testStartTime,
      },
      (result) => result.success,
      workflowId ? 60000 : 900000, // 1 min if we tracked via Neo4j, 15 min otherwise
      30000
    )

    console.log("[E2E Test] PR verification result:", prVerification)

    // At minimum, we expect some activity on the PR
    // The workflow should have either:
    // 1. Pushed commits to the PR
    // 2. Posted comments on the PR
    // 3. Both

    if (!prVerification.success) {
      console.warn(
        "[E2E Test] No PR activity detected. This could mean:\n" +
        "- The workflow is still running\n" +
        "- The workflow failed silently\n" +
        "- The PR was not processed\n" +
        `Details: ${JSON.stringify(prVerification.details, null, 2)}`
      )
    }

    // The test passes if we see any activity from the workflow
    // In a real scenario, you might want stricter assertions
    expect(prVerification.details.hasRecentCommits || prVerification.details.hasRecentComments).toBe(
      true
    )

    console.log("[E2E Test] Success! Workflow processed the PR.")
    console.log(`[E2E Test] PR URL: ${prVerification.details.prUrl}`)
    if (prVerification.details.lastCommitMessage) {
      console.log(`[E2E Test] Last commit: ${prVerification.details.lastCommitMessage}`)
    }
    if (prVerification.details.lastCommentBody) {
      console.log(`[E2E Test] Last comment: ${prVerification.details.lastCommentBody}`)
    }
  }, 960000) // 16 minute timeout (15 min workflow + 1 min buffer)
})
