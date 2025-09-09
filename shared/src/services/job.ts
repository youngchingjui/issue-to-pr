import { getQueue } from "@shared/services/queue"
import { JobsOptions } from "bullmq"

/**
 * Enqueue a job onto a specific queue with a specific job name.
 *
 * @param queueName - The queue to add the job to (e.g., "default")
 * @param jobName - The logical job name to process (e.g., "summarizeIssue")
 * @param data - Arbitrary payload for the job
 * @param opts - BullMQ job options
 * @returns job id as string
 */
export async function addJob<T extends Record<string, unknown>>(
  queueName: string,
  jobName: string,
  data: T,
  opts: JobsOptions = {},
  redisUrl: string
): Promise<string | undefined> {
  const queue = getQueue(queueName, redisUrl)
  const job = await queue.add(jobName, data, opts)
  return job.id
}
