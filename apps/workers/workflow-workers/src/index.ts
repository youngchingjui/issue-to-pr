/*
 * BullMQ worker with simple job routing.
 *
 * To start the worker locally from root directory:
 *   pnpm dev:workflow-workers
 *
 * Jobs in this file:
 * - Load all necessary environment variables
 * - Manage worker lifecycle (start, stop, shutdown), including graceful shutdown of worker when receiving SIGINT or SIGTERM
 * - Attach worker to a specific queue
 * - Attach "handler" to the worker

 */
import { QueueEvents, Worker } from "bullmq"
import dotenv from "dotenv"
import IORedis from "ioredis"
import path from "path"
import { WORKFLOW_JOBS_QUEUE } from "shared/entities"
import { fileURLToPath } from "url"

import { handler } from "./handler"
import { envSchema } from "./schemas"

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
  console.log(
    `Worker is processing job ${job.id} with progress ${job.progress}`
  )
})

worker.on("completed", (job) => {
  console.log(
    `Worker has completed job ${job.id} and returned ${job.returnvalue}`
  )
})

worker.on("failed", (job) => {
  console.log(
    `Worker has failed job ${job?.id} with reason ${job?.failedReason}`
  )
})

// Events don't belong here, but putting in for debugging for now.

const queueEvents = new QueueEvents(WORKFLOW_JOBS_QUEUE, { connection })

queueEvents.on("waiting", ({ jobId, prev }) => {
  console.log(
    `A job event with ID ${jobId} is waiting; previous status was ${prev}`
  )
})

queueEvents.on("active", ({ jobId, prev }) => {
  console.log(`Job event ${jobId} is now active; previous status was ${prev}`)
})

queueEvents.on("completed", ({ jobId, returnvalue, prev }) => {
  console.log(
    `Job event ${jobId} has completed and returned ${returnvalue}; previous status was ${prev}`
  )
})

queueEvents.on("failed", ({ jobId, failedReason, prev }) => {
  console.log(
    `Job event ${jobId} has failed with reason ${failedReason}; previous status was ${prev}`
  )
})
