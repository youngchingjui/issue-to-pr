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
import IORedis from "ioredis"
import { WORKFLOW_JOBS_QUEUE } from "shared/entities"

import { handler } from "./handler"
import { getEnvVar } from "./helper"

const { REDIS_URL } = getEnvVar()

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

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

// Graceful shutdown handling: stop taking new jobs, wait for in-flight jobs to finish, then exit.
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 30000)
let shuttingDown = false

async function gracefulShutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`[worker] Received ${signal}. Beginning graceful shutdown…`)
  const timeout = setTimeout(() => {
    console.warn(
      `[worker] Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms. Forcing exit.`
    )
    // Ensure connections are dropped before forcing exit
    try {
      connection.disconnect()
    } catch {}
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)

  try {
    // Close the worker: this stops fetching new jobs and waits for the current one to finish
    await worker.close()
    // Close queue event listener
    await queueEvents.close()
    // Close the redis connection
    await connection.quit()
    clearTimeout(timeout)
    console.log("[worker] Shutdown complete. Exiting…")
    process.exit(0)
  } catch (err) {
    console.error("[worker] Error during shutdown:", err)
    clearTimeout(timeout)
    process.exit(1)
  }
}

process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)

process.on("unhandledRejection", (reason) => {
  console.error("[worker] Unhandled promise rejection:", reason)
})

process.on("uncaughtException", (err) => {
  console.error("[worker] Uncaught exception:", err)
  // Try to shutdown gracefully as well
  void gracefulShutdown("SIGTERM")
})

