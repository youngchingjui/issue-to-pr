import type { QueueEnum } from "@shared/entities/Queue"
import { getQueue } from "@shared/services/queue"
import { JobsOptions } from "bullmq"

/**
 * Enqueue a job onto a specific queue with a specific job name.
 */
export async function addJob<T extends Record<string, unknown>>(
  queueName: QueueEnum,
  jobName: string,
  data: T,
  opts: JobsOptions = {},
  redisUrl: string
): Promise<string | undefined> {
  const queue = getQueue(queueName, redisUrl)
  const job = await queue.add(jobName, data, opts)
  return job.id
}
