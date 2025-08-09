// TODO: Since this imports bullmq, this is probably a server script that requires nodejs.
// Probalby need to add 'use server' to it.
// Probably also need to find a better place to put this, depending on how it's used in our code architecture.
// We have some documentation that describes how we want to organize code.

"use server"
import { Queue } from "bullmq"
import {
  AutoResolveIssueJobData,
  autoResolveIssueJobDataSchema,
  CommentOnIssueJobData,
  commentOnIssueJobDataSchema,
  QUEUE_NAMES,
  type QueueName,
  ResolveIssueJobData,
  resolveIssueJobDataSchema,
} from "@shared/lib/schemas"

// Queue instances
let resolveIssueQueue: Queue | null = null
let commentOnIssueQueue: Queue | null = null
let autoResolveIssueQueue: Queue | null = null

async function getResolveIssueQueue(): Promise<Queue> {
  if (!resolveIssueQueue) {
    // Use a simple Redis connection for BullMQ
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    if (!redisUrl) {
      throw new Error("Redis URL not found in environment variables")
    }

    resolveIssueQueue = new Queue(QUEUE_NAMES.RESOLVE_ISSUE, {
      connection: {
        host: redisUrl.includes("localhost") ? "localhost" : redisUrl,
        port: redisUrl.includes("localhost") ? 6379 : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })
  }
  return resolveIssueQueue
}

async function getCommentOnIssueQueue(): Promise<Queue> {
  if (!commentOnIssueQueue) {
    // Use a simple Redis connection for BullMQ
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    if (!redisUrl) {
      throw new Error("Redis URL not found in environment variables")
    }

    commentOnIssueQueue = new Queue(QUEUE_NAMES.COMMENT_ON_ISSUE, {
      connection: {
        host: redisUrl.includes("localhost") ? "localhost" : redisUrl,
        port: redisUrl.includes("localhost") ? 6379 : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })
  }
  return commentOnIssueQueue
}

async function getAutoResolveIssueQueue(): Promise<Queue> {
  if (!autoResolveIssueQueue) {
    // Use a simple Redis connection for BullMQ
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    if (!redisUrl) {
      throw new Error("Redis URL not found in environment variables")
    }

    autoResolveIssueQueue = new Queue(QUEUE_NAMES.AUTO_RESOLVE_ISSUE, {
      connection: {
        host: redisUrl.includes("localhost") ? "localhost" : redisUrl,
        port: redisUrl.includes("localhost") ? 6379 : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })
  }
  return autoResolveIssueQueue
}

// Job enqueue functions
export async function enqueueResolveIssue(
  data: ResolveIssueJobData
): Promise<string> {
  // Validate data
  const validatedData = resolveIssueJobDataSchema.parse(data)

  const queue = await getResolveIssueQueue()
  const job = await queue.add(QUEUE_NAMES.RESOLVE_ISSUE, validatedData, {
    jobId: validatedData.jobId, // Use our jobId as BullMQ job ID
  })

  return job.id!
}

export async function enqueueCommentOnIssue(
  data: CommentOnIssueJobData
): Promise<string> {
  // Validate data
  const validatedData = commentOnIssueJobDataSchema.parse(data)

  const queue = await getCommentOnIssueQueue()
  const job = await queue.add(QUEUE_NAMES.COMMENT_ON_ISSUE, validatedData, {
    jobId: validatedData.jobId, // Use our jobId as BullMQ job ID
  })

  return job.id!
}

export async function enqueueAutoResolveIssue(
  data: AutoResolveIssueJobData
): Promise<string> {
  // Validate data
  const validatedData = autoResolveIssueJobDataSchema.parse(data)

  const queue = await getAutoResolveIssueQueue()
  const job = await queue.add(QUEUE_NAMES.AUTO_RESOLVE_ISSUE, validatedData, {
    jobId: validatedData.jobId, // Use our jobId as BullMQ job ID
  })

  return job.id!
}

// Job status functions
export async function getJobStatus(queueName: string, jobId: string) {
  let queue: Queue

  switch (queueName) {
    case QUEUE_NAMES.RESOLVE_ISSUE:
      queue = await getResolveIssueQueue()
      break
    case QUEUE_NAMES.COMMENT_ON_ISSUE:
      queue = await getCommentOnIssueQueue()
      break
    case QUEUE_NAMES.AUTO_RESOLVE_ISSUE:
      queue = await getAutoResolveIssueQueue()
      break
    default:
      throw new Error(`Unknown queue: ${queueName}`)
  }

  const job = await queue.getJob(jobId)
  if (!job) {
    return null
  }

  return {
    id: job.id,
    progress: job.progress,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    returnvalue: job.returnvalue,
  }
}

async function getQueueByName(queueName: QueueName): Promise<Queue> {
  switch (queueName) {
    case QUEUE_NAMES.RESOLVE_ISSUE:
      return await getResolveIssueQueue()
    case QUEUE_NAMES.COMMENT_ON_ISSUE:
      return await getCommentOnIssueQueue()
    case QUEUE_NAMES.AUTO_RESOLVE_ISSUE:
      return await getAutoResolveIssueQueue()
    default:
      throw new Error(`Unknown queue: ${queueName}`)
  }
}

export async function getQueueCounts(queueName: QueueName) {
  const queue = await getQueueByName(queueName)
  const counts = await queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed"
  )
  return counts
}

export async function getActiveJobs(queueName: QueueName, limit = 20) {
  const queue = await getQueueByName(queueName)
  const jobs = await queue.getJobs(["active"], 0, limit)
  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    progress: job.progress,
    data: job.data,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
  }))
}

export async function getRecentJobs(
  queueName: QueueName,
  types: Array<"completed" | "failed"> = ["completed", "failed"],
  limit = 20
) {
  const queue = await getQueueByName(queueName)
  const jobs = await queue.getJobs(types, 0, limit)
  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    failedReason: job.failedReason,
    returnvalue: job.returnvalue,
    finishedOn: job.finishedOn,
    data: job.data,
  }))
}

export async function getWorkers(queueName: QueueName) {
  const queue = await getQueueByName(queueName)
  // BullMQ returns worker info objects connected to this queue
  // Shape can vary by BullMQ version; expose raw info for UI
  const workers = await queue.getWorkers()
  return workers
}

export async function getAllQueuesStatus() {
  const names: QueueName[] = [
    QUEUE_NAMES.RESOLVE_ISSUE,
    QUEUE_NAMES.COMMENT_ON_ISSUE,
    QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
  ]

  const results = await Promise.all(
    names.map(async (name) => {
      const [counts, activeJobs, recentCompleted, recentFailed, workers] =
        await Promise.all([
          getQueueCounts(name),
          getActiveJobs(name, 20),
          getRecentJobs(name, ["completed"], 10),
          getRecentJobs(name, ["failed"], 10),
          getWorkers(name),
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
