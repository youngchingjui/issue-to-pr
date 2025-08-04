import { Queue } from "bullmq"

import {
  AutoResolveIssueJobData,
  CommentOnIssueJobData,
} from "@/services/shared/dist"
import {
  autoResolveIssueJobDataSchema,
  commentOnIssueJobDataSchema,
  ResolveIssueJobData,
  resolveIssueJobDataSchema,
} from "@/services/shared/src/types"

// Queue names (must match worker)
export const QUEUE_NAMES = {
  RESOLVE_ISSUE: "resolve-issue",
  COMMENT_ON_ISSUE: "comment-on-issue",
  AUTO_RESOLVE_ISSUE: "auto-resolve-issue",
} as const

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
