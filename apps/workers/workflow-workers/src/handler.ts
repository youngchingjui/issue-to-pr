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

import { JobEventSchema } from "@/shared/entities/events/Job"

import { publishJobStatus } from "./helper"
import { autoResolveIssue } from "./orchestrators/autoResolveIssue"
import { simulateLongRunningWorkflow } from "./orchestrators/simulateLongRunningWorkflow"
import { summarizeIssue } from "./orchestrators/summarizeIssue"
import { createDependentPR } from "./orchestrators/createDependentPR"

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
      case "simulateLongRunningWorkflow": {
        await publishJobStatus(
          job.id,
          `Job: Simulate long-running (${jobData.seconds}s)`
        )
        const result = await simulateLongRunningWorkflow(
          jobData.seconds,
          job.id
        )
        await publishJobStatus(job.id, `Completed: ${result}`)
        return result
      }
      case "autoResolveIssue": {
        await publishJobStatus(job.id, "Job: Auto resolve issue")
        const result = await autoResolveIssue(job.id, jobData)
        await publishJobStatus(
          job.id,
          `Completed: ${result.map((m) => m.content).join("\n")}`
        )
        return result.map((m) => m.content).join("\n")
      }
      case "createDependentPR": {
        await publishJobStatus(job.id, "Job: Create dependent PR")
        const result = await createDependentPR(job.id, jobData)
        await publishJobStatus(job.id, `Completed: ${result}`)
        return result
      }
      default: {
        await publishJobStatus(job.id, "Failed: Unknown job name")
        throw new Error(`Unknown job name: ${job.name}`)
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    await publishJobStatus(job.id, `Failed: ${msg}`)
    throw error instanceof Error ? error : new Error(msg)
  }
}

