"use server"

import { BullMQAdapter } from "@/shared/adapters/BullMQAdapter"
import { RedisAdapter } from "@/shared/adapters/ioredis-adapter"
import type { JobPort } from "@/shared/core/ports/JobPort"
import type { QueuePort } from "@/shared/core/ports/QueuePort"
import {
  AutoResolveIssueJobData,
  autoResolveIssueJobDataSchema,
  CommentOnIssueJobData,
  commentOnIssueJobDataSchema,
  QUEUE_NAMES,
  type QueueName,
  ResolveIssueJobData,
  resolveIssueJobDataSchema,
} from "@/shared/lib/schemas"

class QueueManager {
  private queuePort: QueuePort | null = null
  private jobPort: JobPort | null = null

  /**
   * Initialize the queue manager by setting up adapters and creating queues.
   * This must be called before using any other methods.
   * Multiple calls to initialize are safe - subsequent calls are no-ops.
   */
  public async initialize(): Promise<void> {
    if (this.queuePort && this.jobPort) return // Already initialized

    // Compose adapters (app layer)
    const redisAdapter = new RedisAdapter()
    const adapter = new BullMQAdapter(redisAdapter)

    // Do NOT create queues here; the worker owns queue creation/config.
    // We only attach to ports for read/enqueue operations.
    this.queuePort = adapter
    this.jobPort = adapter
  }

  /**
   * Get a queue instance by name. Returns null if not initialized or queue not found.
   */
  // Helper methods now delegate to QueuePort

  // Job enqueue functions - require initialization
  public async enqueueResolveIssue(data: ResolveIssueJobData): Promise<string> {
    if (!this.jobPort) {
      throw new Error("QueueManager not initialized. Call initialize() first.")
    }

    const validatedData = resolveIssueJobDataSchema.parse(data)
    return await this.jobPort.addJob(
      QUEUE_NAMES.RESOLVE_ISSUE,
      validatedData as unknown as Record<string, unknown>,
      { jobId: validatedData.jobId }
    )
  }

  public async enqueueCommentOnIssue(
    data: CommentOnIssueJobData
  ): Promise<string> {
    if (!this.jobPort) {
      throw new Error("QueueManager not initialized. Call initialize() first.")
    }

    const validatedData = commentOnIssueJobDataSchema.parse(data)
    return await this.jobPort.addJob(
      QUEUE_NAMES.COMMENT_ON_ISSUE,
      validatedData as unknown as Record<string, unknown>,
      { jobId: validatedData.jobId }
    )
  }

  public async enqueueAutoResolveIssue(
    data: AutoResolveIssueJobData
  ): Promise<string> {
    if (!this.jobPort) {
      throw new Error("QueueManager not initialized. Call initialize() first.")
    }

    const validatedData = autoResolveIssueJobDataSchema.parse(data)
    return await this.jobPort.addJob(
      QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
      validatedData as unknown as Record<string, unknown>,
      { jobId: validatedData.jobId }
    )
  }

  private async getQueueCounts(queueName: QueueName) {
    if (!this.queuePort) throw new Error("QueueManager not initialized")
    return this.queuePort.getQueueCounts(queueName)
  }

  private async getActiveJobs(queueName: QueueName, limit = 20) {
    if (!this.queuePort) throw new Error("QueueManager not initialized")
    return this.queuePort.getActiveJobs(queueName, limit)
  }

  private async getRecentJobs(
    queueName: QueueName,
    types: Array<"completed" | "failed"> = ["completed", "failed"],
    limit = 20
  ) {
    if (!this.queuePort) throw new Error("QueueManager not initialized")
    return this.queuePort.getRecentJobs(queueName, types, limit)
  }

  private async getWorkers(queueName: QueueName) {
    if (!this.queuePort) throw new Error("QueueManager not initialized")
    return this.queuePort.getWorkers(queueName)
  }

  public async getAllQueuesStatus() {
    if (!this.queuePort) {
      throw new Error("QueueManager not initialized. Call initialize() first.")
    }

    const names: QueueName[] = [
      QUEUE_NAMES.RESOLVE_ISSUE,
      QUEUE_NAMES.COMMENT_ON_ISSUE,
      QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
    ]

    const results = await Promise.all(
      names.map(async (name) => {
        const [counts, activeJobs, recentCompleted, recentFailed, workers] =
          await Promise.all([
            this.getQueueCounts(name),
            this.getActiveJobs(name, 20),
            this.getRecentJobs(name, ["completed"], 10),
            this.getRecentJobs(name, ["failed"], 10),
            this.getWorkers(name),
          ])

        return {
          name,
          counts,
          activeJobs,
          recentCompleted,
          recentFailed,
          workers,
        }
      })
    )

    return results
  }
}

// Create and export a default instance for backwards compatibility
// and convenience in API routes
const queueManager = new QueueManager()

export async function initialize(): Promise<void> {
  await queueManager.initialize()
}

export async function enqueueResolveIssue(
  data: ResolveIssueJobData
): Promise<string> {
  await queueManager.initialize()
  return queueManager.enqueueResolveIssue(data)
}

export async function enqueueCommentOnIssue(
  data: CommentOnIssueJobData
): Promise<string> {
  await queueManager.initialize()
  return queueManager.enqueueCommentOnIssue(data)
}

export async function enqueueAutoResolveIssue(
  data: AutoResolveIssueJobData
): Promise<string> {
  await queueManager.initialize()
  return queueManager.enqueueAutoResolveIssue(data)
}

export async function getAllQueuesStatus() {
  await queueManager.initialize()
  return queueManager.getAllQueuesStatus()
}
