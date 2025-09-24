/*
 * BullMQ worker with simple job routing.
 *
 * To start the worker locally:
 *   pnpm dev:worker
 *
 *  This is a "controller" level file. It can identify the adapters to use and route jobs
 *  to appropriate processors and services, inject dependencies into the processors and services,
 *
 *  It should not define service-level helpers or define adapters to databases or 3rd party services.
 */
import { Job, QueueEvents, Worker } from "bullmq"
import dotenv from "dotenv"
import IORedis from "ioredis"
import OpenAI from "openai"
import path from "path"
import { fileURLToPath } from "url"

// Load environment variables from monorepo root regardless of CWD
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// dist -> workers -> apps -> repoRoot
const repoRoot = path.resolve(__dirname, "../../../../")

const envFilename =
  process.env.NODE_ENV === "production" ? ".env.production.local" : ".env.local"

dotenv.config({ path: path.join(repoRoot, envFilename) })
// Optional: also load base .env as a fallback if present
dotenv.config({ path: path.join(repoRoot, ".env") })

// TODO: We should be using redis and openai adapters from /shared/src/adapters
// to follow clean architecture principles, instead of importing
// directly from these 3rd party libraries.

const redisUrl = process.env.REDIS_URL
const openaiApiKey = process.env.OPENAI_API_KEY

if (!redisUrl) {
  throw new Error("REDIS_URL is not set")
}
if (!openaiApiKey) {
  console.warn("OPENAI_API_KEY is not set; summarize jobs will fail.")
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

const openai = new OpenAI({ apiKey: openaiApiKey })

// TODO: This is a service-level helper, and should be defined in /shared/src/services/job.ts
// to follow clean architecture principles.
async function publishStatus(jobId: string, status: string) {
  try {
    await connection.publish(
      "jobStatusUpdate",
      JSON.stringify({ jobId, status })
    )
  } catch (err) {
    console.error("Failed to publish status update:", err)
  }
}

// TODO: This is a service-level helper, and should be defined in /shared/src/services/issue.ts
// to follow clean architecture principles.
async function summarizeIssue(job: Job): Promise<string> {
  if (!openaiApiKey) {
    throw new Error(
      "OpenAI API key is missing. Please set OPENAI_API_KEY on the worker server to enable issue summarization."
    )
  }

  const { title, body } = job.data as { title?: string; body?: string }
  const systemPrompt =
    "You are an expert GitHub assistant. Given an issue title and body, produce a concise, actionable summary (2-4 sentences) highlighting the problem, scope, and desired outcome."
  const userPrompt = `Title: ${title ?? "(none)"}\n\nBody:\n${body ?? "(empty)"}`

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() ?? ""
}

async function processor(job: Job) {
  console.log(`Processing job ${job.id}: ${job.name}`)
  await publishStatus(String(job.id), "Started: processing job")

  try {
    switch (job.name) {
      case "summarizeIssue": {
        const summary = await summarizeIssue(job)
        const final = summary || "No summary generated"
        await publishStatus(String(job.id), `Completed: ${final}`)
        return { summary: final }
      }
      default: {
        const msg = `Unknown job name: ${job.name}`
        await publishStatus(String(job.id), `Failed: ${msg}`)
        throw new Error(msg)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await publishStatus(String(job.id), `Failed: ${message}`)
    throw err
  }
}

// TODO: Refactor to allow for multiple workers, queues, etc.
new Worker("default", processor, { connection })

const events = new QueueEvents("default", { connection })

events.on("completed", ({ jobId }) => {
  console.log(`Job ${jobId} completed`)
})

events.on("failed", ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason)
})

console.log("Worker started and listening for jobs on the 'default' queue…")
