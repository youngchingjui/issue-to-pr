import { Queue } from "bullmq"
import { getSharedRedisClient } from "shared"

// Queue names
export const QUEUE_NAMES = {
  RESOLVE_ISSUE: "resolve-issue",
  COMMENT_ON_ISSUE: "comment-on-issue",
  AUTO_RESOLVE_ISSUE: "auto-resolve-issue",
} as const

// Default job options
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
}

// Create queue instances
export async function createQueues() {
  const redisConnection = await getSharedRedisClient()

  const resolveIssueQueue = new Queue(QUEUE_NAMES.RESOLVE_ISSUE, {
    connection: redisConnection,
    defaultJobOptions,
  })

  const commentOnIssueQueue = new Queue(QUEUE_NAMES.COMMENT_ON_ISSUE, {
    connection: redisConnection,
    defaultJobOptions,
  })

  const autoResolveIssueQueue = new Queue(QUEUE_NAMES.AUTO_RESOLVE_ISSUE, {
    connection: redisConnection,
    defaultJobOptions,
  })

  return {
    resolveIssueQueue,
    commentOnIssueQueue,
    autoResolveIssueQueue,
  }
}

export type Queues = Awaited<ReturnType<typeof createQueues>>
