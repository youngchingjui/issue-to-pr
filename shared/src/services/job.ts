import { JobsOptions } from "bullmq"

import { JobEvent } from "@/entities/events/Job"
import type { QueueEnum } from "@/entities/Queue"
import { getQueue } from "@/services/queue"

/**
 * Enqueue a job onto a specific queue with a specific job name.
 */
export async function addJob(
  queueName: QueueEnum,
  job: JobEvent,
  opts: JobsOptions = {},
  redisUrl: string
): Promise<string | undefined> {
  const queue = getQueue(queueName, redisUrl)
  const { id } = await queue.add(job.name, job.data, opts)
  return id
}
