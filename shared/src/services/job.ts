import { JobsOptions } from "bullmq"

import { getQueue } from "@/shared/src/services/queue"

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
  opts: JobsOptions = {}
): Promise<string> {
  const queue = getQueue(queueName)
  const job = await queue.add(jobName, data, opts)
  return job.id as string
}

