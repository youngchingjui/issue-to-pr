import { WorkerService } from "@/shared/lib/WorkerService"
import { BullMQAdapter } from "@/shared/adapters/BullMQAdapter"
import { getRedisAdapter } from "@/shared/lib/redis"

// TODO: These should be called "/shared/lib/workflows/autoResolveIssue" etc.
import { processAutoResolveIssue } from "@/shared/lib/jobs/autoResolveIssue"
import { processCommentOnIssue } from "@/shared/lib/jobs/commentOnIssue"
import { processResolveIssue } from "@/shared/lib/jobs/resolveIssue"

// Queue names
const QUEUE_NAMES = {
  RESOLVE_ISSUE: "resolve-issue",
  COMMENT_ON_ISSUE: "comment-on-issue",
  AUTO_RESOLVE_ISSUE: "auto-resolve-issue",
} as const

async function startWorker() {
  console.log("[Worker] Starting issue-to-pr background worker...")

  try {
    // Get Redis adapter
    const redisAdapter = getRedisAdapter()
    console.log("[Worker] Connected to Redis")

    // Create BullMQ adapter
    const workerAdapter = new BullMQAdapter(redisAdapter)

    // Create worker service
    const workerService = new WorkerService(workerAdapter)

    // Define queue configurations
    const queueDefinitions = [
      {
        name: QUEUE_NAMES.RESOLVE_ISSUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential" as const,
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: QUEUE_NAMES.COMMENT_ON_ISSUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential" as const,
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential" as const,
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
    ]

    // Define worker configurations
    const workerDefinitions = [
      {
        name: QUEUE_NAMES.RESOLVE_ISSUE,
        concurrency: 2,
        processor: processResolveIssue,
      },
      {
        name: QUEUE_NAMES.COMMENT_ON_ISSUE,
        concurrency: 3,
        processor: processCommentOnIssue,
      },
      {
        name: QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
        concurrency: 1,
        processor: processAutoResolveIssue,
      },
    ]

    // Start all workers
    await workerService.startWorkers(workerDefinitions, queueDefinitions)

    // Set up graceful shutdown
    process.on("SIGINT", async () => {
      console.log("[Worker] Received SIGINT, shutting down gracefully...")
      await workerService.shutdown()
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      console.log("[Worker] Received SIGTERM, shutting down gracefully...")
      await workerService.shutdown()
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
