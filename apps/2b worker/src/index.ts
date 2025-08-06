import { QueueEvents, Worker } from "bullmq"

import { getRedisClient } from "@/shared/1a lib/redis"

import { processAutoResolveIssue } from "./jobs/autoResolveIssue.js"
import { processCommentOnIssue } from "./jobs/commentOnIssue.js"
import { QUEUE_NAMES } from "./queues/index.js"

async function startWorker() {
  console.log("[Worker] Starting issue-to-pr background worker...")

  try {
    // Get Redis connection
    const redisConnection = await getRedisClient()
    console.log("[Worker] Connected to Redis")

    // Create workers for each queue
    const resolveIssueWorker = new Worker(
      QUEUE_NAMES.RESOLVE_ISSUE,
      processAutoResolveIssue,
      {
        connection: redisConnection,
        concurrency: 2, // Process up to 2 jobs concurrently
      }
    )

    const commentOnIssueWorker = new Worker(
      QUEUE_NAMES.COMMENT_ON_ISSUE,
      processCommentOnIssue,
      {
        connection: redisConnection,
        concurrency: 3, // Comments can be processed faster
      }
    )

    const autoResolveIssueWorker = new Worker(
      QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
      processAutoResolveIssue,
      {
        connection: redisConnection,
        concurrency: 1, // More resource intensive
      }
    )

    // Set up queue events for monitoring
    const resolveIssueEvents = new QueueEvents(QUEUE_NAMES.RESOLVE_ISSUE, {
      connection: redisConnection,
    })
    const commentOnIssueEvents = new QueueEvents(QUEUE_NAMES.COMMENT_ON_ISSUE, {
      connection: redisConnection,
    })
    const autoResolveIssueEvents = new QueueEvents(
      QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
      { connection: redisConnection }
    )

    // Event listeners for monitoring
    resolveIssueWorker.on("completed", (job) => {
      console.log(
        `[Worker] Job ${job.id} completed in queue ${QUEUE_NAMES.RESOLVE_ISSUE}`
      )
    })

    resolveIssueWorker.on("failed", (job, err) => {
      console.error(
        `[Worker] Job ${job?.id} failed in queue ${QUEUE_NAMES.RESOLVE_ISSUE}:`,
        err
      )
    })

    commentOnIssueWorker.on("completed", (job) => {
      console.log(
        `[Worker] Job ${job.id} completed in queue ${QUEUE_NAMES.COMMENT_ON_ISSUE}`
      )
    })

    commentOnIssueWorker.on("failed", (job, err) => {
      console.error(
        `[Worker] Job ${job?.id} failed in queue ${QUEUE_NAMES.COMMENT_ON_ISSUE}:`,
        err
      )
    })

    autoResolveIssueWorker.on("completed", (job) => {
      console.log(
        `[Worker] Job ${job.id} completed in queue ${QUEUE_NAMES.AUTO_RESOLVE_ISSUE}`
      )
    })

    autoResolveIssueWorker.on("failed", (job, err) => {
      console.error(
        `[Worker] Job ${job?.id} failed in queue ${QUEUE_NAMES.AUTO_RESOLVE_ISSUE}:`,
        err
      )
    })

    // Global error handling
    resolveIssueWorker.on("error", (err) => {
      console.error("[Worker] Resolve issue worker error:", err)
    })

    commentOnIssueWorker.on("error", (err) => {
      console.error("[Worker] Comment on issue worker error:", err)
    })

    autoResolveIssueWorker.on("error", (err) => {
      console.error("[Worker] Auto resolve issue worker error:", err)
    })

    console.log("[Worker] All workers started successfully")
    console.log(`[Worker] Listening for jobs on queues:`)
    console.log(`  - ${QUEUE_NAMES.RESOLVE_ISSUE} (concurrency: 2)`)
    console.log(`  - ${QUEUE_NAMES.COMMENT_ON_ISSUE} (concurrency: 3)`)
    console.log(`  - ${QUEUE_NAMES.AUTO_RESOLVE_ISSUE} (concurrency: 1)`)

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("[Worker] Received SIGINT, shutting down gracefully...")

      await Promise.all([
        resolveIssueWorker.close(),
        commentOnIssueWorker.close(),
        autoResolveIssueWorker.close(),
        resolveIssueEvents.close(),
        commentOnIssueEvents.close(),
        autoResolveIssueEvents.close(),
      ])

      console.log("[Worker] All workers shut down successfully")
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      console.log("[Worker] Received SIGTERM, shutting down gracefully...")

      await Promise.all([
        resolveIssueWorker.close(),
        commentOnIssueWorker.close(),
        autoResolveIssueWorker.close(),
        resolveIssueEvents.close(),
        commentOnIssueEvents.close(),
        autoResolveIssueEvents.close(),
      ])

      console.log("[Worker] All workers shut down successfully")
      process.exit(0)
    })
  } catch (error) {
    console.error("[Worker] Failed to start worker:", error)
    process.exit(1)
  }
}

// Start the worker
startWorker().catch((error) => {
  console.error("[Worker] Unhandled error:", error)
  process.exit(1)
})
