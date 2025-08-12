/*
 * Example BullMQ worker.
 *
 * To start the worker locally:
 *   pnpm worker
 *
 * The worker listens to the default queue defined in lib/queue.ts and simply
 * logs the job information before marking the job as completed. Replace the
 * processor function with real business logic as needed.
 */
import { Job, QueueEvents, Worker } from "bullmq"
import dotenv from "dotenv"
import IORedis from "ioredis"
import path from "path"
import { fileURLToPath } from "url"

// Load environment variables from monorepo root regardless of CWD
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// dist -> workers -> apps -> repoRoot
const repoRoot = path.resolve(__dirname, "../../../")

const envFilename =
  process.env.NODE_ENV === "production" ? ".env.production.local" : ".env.local"

dotenv.config({ path: path.join(repoRoot, envFilename) })
// Optional: also load base .env as a fallback if present
dotenv.config({ path: path.join(repoRoot, ".env") })

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error("REDIS_URL is not set")
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })

async function processor(job: Job) {
  console.log(`Processing job ${job.id}: ${job.name}`)
  console.log("Job data:", job.data)
  // TODO: implement your real processing logic here
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
