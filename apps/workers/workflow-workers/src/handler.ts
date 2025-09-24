/**
 * Handler for the workflow worker.
 *
 * This file is responsible for handling incoming jobs and routing them to the appropriate processor.
 * Worker will call this handler when receiving jobs from the queue.
 *
 * File responsibilities:
 * - Parse job data
 * - Route job to the appropriate processor
 * - Publish job status updates
 *
 * @returns The result of the job. Currently, this is not being used.
 */

import { Job } from "bullmq"
import { JobEventSchema } from "shared/entities/events"

import { publishJobStatus } from "./helper"
import { summarizeIssue } from "./orchestrators/summarizeIssue"

export async function handler(job: Job): Promise<string> {
  console.log(`Received job ${job.id}: ${job.name}`)

  if (!job.id) {
    await publishJobStatus("unknown", "Failed: Job ID is required")
    throw new Error("Job ID is required")
  }

  await publishJobStatus(job.id, "Parsing job")

  const { success, data, error } = JobEventSchema.safeParse(job)
  if (!success) {
    await publishJobStatus(job.id, `Failed: Invalid job data: ${error.message}`)
    throw new Error("Invalid job data")
  }

  const { name, data: jobData } = data
  try {
    switch (name) {
      case "summarizeIssue": {
        await publishJobStatus(job.id, "Job: Summarize issue")
        const result = await summarizeIssue(jobData)
        await publishJobStatus(job.id, `Completed: ${result}`)
        return result
      }
      default: {
        await publishJobStatus(job.id, "Failed: Unknown job name")
        throw new Error(`Unknown job name: ${job.name}`)
      }
    }
  } catch (error) {
    await publishJobStatus(job.id, `Failed: ${error}`)
    throw error
  }
}
