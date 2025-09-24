/**
 * Handler for the workflow worker.
 *
 * This file is responsible for handling incoming jobs and routing them to the appropriate processor.
 * Worker will call this handler when receiving jobs from the queue.
 *
 * File responsibilities:
 * - Parse job data
 * - Route job to the appropriate processor
 * @returns The result of the job. Currently, this is not being used.
 */

import { Job } from "bullmq"
import { JobEventSchema } from "shared/entities/events"

import { summarizeIssue } from "./orchestrators/summarizeIssue"

export async function handler(job: Job): Promise<string> {
  console.log(`Received job ${job.id}: ${job.name}`)

  const { name, data } = JobEventSchema.parse(job)
  switch (name) {
    case "summarizeIssue": {
      return summarizeIssue(data)
    }
    default: {
      throw new Error(`Unknown job name: ${job.name}`)
    }
  }
}

// TODO: This is a service-level helper, and should be defined in /shared/src/services/job.ts
// to follow clean architecture principles.
// async function publishStatus(jobId: string, status: string) {
//   try {
//     await connection.publish(
//       "jobStatusUpdate",
//       JSON.stringify({ jobId, status })
//     )
//   } catch (err) {
//     console.error("Failed to publish status update:", err)
//   }
// }
