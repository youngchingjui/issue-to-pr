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
import { WORKFLOW_JOBS_QUEUE } from "@shared/entities"
import { QueueEvents, Worker } from "bullmq"
import IORedis from "ioredis"

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
