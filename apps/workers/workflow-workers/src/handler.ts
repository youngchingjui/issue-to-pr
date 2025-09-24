/**
 * Handler for the workflow worker.
 *
 * This file is responsible for handling incoming jobs and routing them to the appropriate processor.
 * Worker will call this handler when receiving jobs from the queue.
 *
 * File responsibilities:
 * - Parse job data
 * - Route job to the appropriate processor
 */

import { Job } from "bullmq"
import { JobEventSchema } from "shared/entities/events"

export async function handler(job: Job) {
  console.log(`Received job ${job.id}: ${job.name}`)

  const { name, data } = JobEventSchema.parse(job.data)
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

// // TODO: This is a service-level helper, and should be defined in /shared/src/services/issue.ts
// // to follow clean architecture principles.
// async function summarizeIssue(job: Job): Promise<string> {
//   if (!openaiApiKey) {
//     throw new Error(
//       "OpenAI API key is missing. Please set OPENAI_API_KEY on the worker server to enable issue summarization."
//     )
//   }

//   const { title, body } = job.data as { title?: string; body?: string }
//   const systemPrompt =
//     "You are an expert GitHub assistant. Given an issue title and body, produce a concise, actionable summary (2-4 sentences) highlighting the problem, scope, and desired outcome."
//   const userPrompt = `Title: ${title ?? "(none)"}\n\nBody:\n${body ?? "(empty)"}`

//   const completion = await openai.chat.completions.create({
//     model: "gpt-5",
//     messages: [
//       { role: "system", content: systemPrompt },
//       { role: "user", content: userPrompt },
//     ],
//   })
//   return completion.choices[0]?.message?.content?.trim() ?? ""
// }

// // TODO: Refactor to allow for multiple processors, queues, etc.
// async function processor(job: Job) {
//   console.log(`Processing job ${job.id}: ${job.name}`)
//   await publishStatus(String(job.id), "Started: processing job")

//   try {
//     switch (job.name) {
//       case "summarizeIssue": {
//         const summary = await summarizeIssue(job)
//         const final = summary || "No summary generated"
//         await publishStatus(String(job.id), `Completed: ${final}`)
//         return { summary: final }
//       }
//       default: {
//         const msg = `Unknown job name: ${job.name}`
//         await publishStatus(String(job.id), `Failed: ${msg}`)
//         throw new Error(msg)
//       }
//     }
//   } catch (err) {
//     const message = err instanceof Error ? err.message : String(err)
//     await publishStatus(String(job.id), `Failed: ${message}`)
//     throw err
//   }
// }
