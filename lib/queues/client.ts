"use server"

import type { Queue } from "bullmq"

import { BullMQAdapter } from "@/shared/adapters/BullMQAdapter"
import { RedisAdapter } from "@/shared/adapters/ioredis-adapter"
import type { WorkerPort } from "@/shared/core/ports/WorkerPort"
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

let workerPortSingleton: WorkerPort | null = null
const queuesByName: Map<QueueName, Queue> = new Map()

async function ensureInitialized(): Promise<WorkerPort> {
  if (workerPortSingleton) {
    return workerPortSingleton
  }

  // Compose adapters (app layer)
  const redisAdapter = new RedisAdapter()
  const adapter = new BullMQAdapter(redisAdapter)
  workerPortSingleton = adapter

  // Ensure queues exist and cache their instances for status operations
  const defaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  }

  const resolveQueue = (await adapter.createQueue({
    name: QUEUE_NAMES.RESOLVE_ISSUE,
    defaultJobOptions,
  })) as Queue
  const commentQueue = (await adapter.createQueue({
    name: QUEUE_NAMES.COMMENT_ON_ISSUE,
    defaultJobOptions,
  })) as Queue
  const autoResolveQueue = (await adapter.createQueue({
    name: QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
    defaultJobOptions,
  })) as Queue

  queuesByName.set(QUEUE_NAMES.RESOLVE_ISSUE, resolveQueue)
  queuesByName.set(QUEUE_NAMES.COMMENT_ON_ISSUE, commentQueue)
  queuesByName.set(QUEUE_NAMES.AUTO_RESOLVE_ISSUE, autoResolveQueue)

  return workerPortSingleton
}

function getCachedQueue(queueName: QueueName): Queue {
  const queue = queuesByName.get(queueName)
  if (!queue) {
    throw new Error(`Queue not initialized: ${queueName}`)
  }
  return queue
}

// Job enqueue functions (via WorkerPort)
export async function enqueueResolveIssue(
  data: ResolveIssueJobData
): Promise<string> {
  const validatedData = resolveIssueJobDataSchema.parse(data)
  const port = await ensureInitialized()
  return await port.addJob(
    QUEUE_NAMES.RESOLVE_ISSUE,
    validatedData as unknown as Record<string, unknown>,
    { jobId: validatedData.jobId }
  )
}

export async function enqueueCommentOnIssue(
  data: CommentOnIssueJobData
): Promise<string> {
  const validatedData = commentOnIssueJobDataSchema.parse(data)
  const port = await ensureInitialized()
  return await port.addJob(
    QUEUE_NAMES.COMMENT_ON_ISSUE,
    validatedData as unknown as Record<string, unknown>,
    { jobId: validatedData.jobId }
  )
}

export async function enqueueAutoResolveIssue(
  data: AutoResolveIssueJobData
): Promise<string> {
  const validatedData = autoResolveIssueJobDataSchema.parse(data)
  const port = await ensureInitialized()
  return await port.addJob(
    QUEUE_NAMES.AUTO_RESOLVE_ISSUE,
    validatedData as unknown as Record<string, unknown>,
    { jobId: validatedData.jobId }
  )
}

async function getQueueByName(queueName: QueueName): Promise<Queue> {
  await ensureInitialized()
  return getCachedQueue(queueName)
}

async function getQueueCounts(queueName: QueueName) {
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

async function getActiveJobs(queueName: QueueName, limit = 20) {
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

async function getRecentJobs(
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

async function getWorkers(queueName: QueueName) {
  const queue = await getQueueByName(queueName)
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
