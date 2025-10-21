/*
 * BullMQ worker with simple job routing.
 *
 * To start the worker locally from root directory:
 *   pnpm dev:workflow-workers
 *
 * Jobs in this file:
 * - Manage worker lifecycle (start, stop, shutdown), including graceful shutdown of worker when receiving SIGINT or SIGTERM
 * - Attach worker to a specific queue
 * - Attach "handler" to the worker

 */
import { QueueEvents, Worker } from "bullmq"
import { getRedisConnection } from "shared/adapters/ioredis/client"
import { WORKFLOW_JOBS_QUEUE } from "shared/entities/Queue"

import { handler } from "./handler"
import { getEnvVar, registerGracefulShutdown } from "./helper"

const { REDIS_URL, WORKER_CONCURRENCY } = getEnvVar()

const workerConn = getRedisConnection(REDIS_URL, "bullmq:worker")
const eventsConn = getRedisConnection(REDIS_URL, "bullmq:events")

const concurrency = Math.max(1, Number(WORKER_CONCURRENCY ?? "1"))

const worker = new Worker(WORKFLOW_JOBS_QUEUE, handler, {
  connection: workerConn,
  concurrency,
})

worker.on("active", (job) => {})

worker.on("ready", () => {
  console.log(
    `Worker is ready and listening for jobs on the '${WORKFLOW_JOBS_QUEUE}' queue… (concurrency=${concurrency})`
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

worker.on("error", (err) => {
  console.error("Worker error:", err)
})

worker.on("closed", () => {})

// Events don't belong here, but putting in for debugging for now.

const queueEvents = new QueueEvents(WORKFLOW_JOBS_QUEUE, {
  connection: eventsConn,
})

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

queueEvents.on("error", (err) => {
  console.error("Queue events error:", err)
})

// Register graceful shutdown with a default 1 hour timeout (overridable via SHUTDOWN_TIMEOUT_MS)
registerGracefulShutdown({ worker, queueEvents, connection: workerConn })

