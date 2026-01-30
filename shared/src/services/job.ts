import { JobsOptions } from "bullmq"

import { JobEvent } from "@/shared/entities/events/Job"
import { getQueue } from "@/shared/services/queue"

/**
 * Enqueue a job onto a specific queue with a specific job name.
 *
 * @param queueName - Queue name. Use WORKFLOW_JOBS_QUEUE constant as default,
 *                    or override via env var (e.g., BULLMQ_QUEUE_NAME) for test isolation.
 */
export async function addJob(
  queueName: string,
  job: JobEvent,
  opts: JobsOptions = {},
  redisUrl: string
): Promise<string | undefined> {
  const queue = getQueue(queueName, redisUrl)
  const { id } = await queue.add(job.name, job.data, opts)
  return id
}
