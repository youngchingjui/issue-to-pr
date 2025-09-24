/*
 * BullMQ worker with simple job routing.
 *
 * To start the worker locally:
 *   pnpm dev:worker
 *
 * Jobs in this file:
 * - Load all necessary environment variables
 * - Manage worker lifecycle (start, stop, shutdown)
 * - Attach worker to a specific queue
 * - Worker should run "handler" on receiving a job
 * - Handle graceful shutdown of worker when receiving SIGINT or SIGTERM
 *   - Worker should complete existing job and stop receiving new jobs before shutting down
 * - Setup event listeners
 */
import { QueueEvents, Worker } from "bullmq"
import dotenv from "dotenv"
import IORedis from "ioredis"
import path from "path"
import { fileURLToPath } from "url"

import { handler } from "./handler"
import { envSchema } from "./schemas"

// TODO: Import WORKFLOW_JOBS_QUEUE from shared/entities/Queue instead
const WORKFLOW_JOBS_QUEUE = "workflow-jobs"

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

const env = envSchema.parse(process.env)

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

const worker = new Worker(WORKFLOW_JOBS_QUEUE, handler, { connection })

worker.on("ready", () => {
  console.log(
    `Worker is ready and listening for jobs on the '${WORKFLOW_JOBS_QUEUE}' queue…`
  )
})

worker.on("progress", (job) => {
  console.log(`${job.id} has progress ${job.progress}`)
})

worker.on("completed", (job) => {
  console.log(`${job.id} has completed and returned ${job.returnvalue}`)
})

worker.on("failed", (job) => {
  console.log(`${job?.id} has failed with reason ${job?.failedReason}`)
})

// Events don't belong here, but putting in for debugging for now.

const queueEvents = new QueueEvents(WORKFLOW_JOBS_QUEUE, { connection })

queueEvents.on("waiting", ({ jobId, prev }) => {
  console.log(`A job with ID ${jobId} is waiting; previous status was ${prev}`)
})

queueEvents.on("active", ({ jobId, prev }) => {
  console.log(`Job ${jobId} is now active; previous status was ${prev}`)
})

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`${jobId} has completed and returned ${returnvalue}`)
})

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`${jobId} has failed with reason ${failedReason}`)
})
