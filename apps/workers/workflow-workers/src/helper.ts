import type { QueueEvents, Worker } from "bullmq"
import dotenv from "dotenv"
import type IORedis from "ioredis"
import path from "path"
import { getRedisConnection } from "shared/adapters/ioredis/client"
import { JOB_STATUS_CHANNEL } from "shared/entities/Channels"
import { JobStatusUpdateSchema } from "shared/entities/events/JobStatus"
import { fileURLToPath } from "url"

import { envSchema, type EnvVariables } from "./schemas"

let envLoaded = false

function loadEnvFromWorkerRoot(): void {
  if (envLoaded) return

  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)
  const workerRoot = path.resolve(dirname, "..")

  const nodeEnv = process.env.NODE_ENV ?? "development"

  // Follow Next.js load order (highest precedence first):
  // process.env → .env.$NODE_ENV.local → .env.local (skip in test) → .env.$NODE_ENV → .env
  const orderedEnvFiles: string[] = [
    `.env.${nodeEnv}.local`,
    ...(nodeEnv === "test" ? [] : [`.env.local`]),
    `.env.${nodeEnv}`,
    `.env`,
  ]

  for (const envFile of orderedEnvFiles) {
    dotenv.config({ path: path.join(workerRoot, envFile) })
  }

  envLoaded = true
}

export function ensureEnvLoaded(): void {
  loadEnvFromWorkerRoot()
}

export function getEnvVar(): EnvVariables {
  ensureEnvLoaded()
  return envSchema.parse(process.env)
}

export async function publishJobStatus(jobId: string, status: string) {
  const { REDIS_URL } = getEnvVar()

  const redis = getRedisConnection(REDIS_URL, "general")
  const jobStatusUpdate = JobStatusUpdateSchema.parse({ jobId, status })
  await redis.publish(JOB_STATUS_CHANNEL, JSON.stringify(jobStatusUpdate))
}

// Register graceful shutdown handlers for the worker process.
// Stops taking new jobs, waits for in-flight jobs to finish, then exits.
// If the timeout elapses, forces exit(1) after disconnecting Redis.
export function registerGracefulShutdown(opts: {
  worker: Worker
  queueEvents: QueueEvents
  connection: IORedis
  timeoutMs?: number
}) {
  const { worker, queueEvents, connection, timeoutMs: timeoutMsOpt } = opts
  const { SHUTDOWN_TIMEOUT_MS: timeoutMsEnv } = getEnvVar()
  const timeoutMs = timeoutMsOpt ?? Number(timeoutMsEnv)

  let shuttingDown = false

  async function gracefulShutdown(signal: NodeJS.Signals) {
    if (shuttingDown) return
    shuttingDown = true

    console.log(`[worker] Received ${signal}. Beginning graceful shutdown…`)
    const timeout = setTimeout(() => {
      console.warn(
        `[worker] Graceful shutdown timed out after ${timeoutMs}ms. Forcing exit.`
      )
      // Ensure connections are dropped before forcing exit (fire-and-forget)
      try {
        connection.disconnect()
      } catch {}
      process.exit(1)
    }, timeoutMs)

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
    void gracefulShutdown("SIGTERM")
  })

  process.on("uncaughtException", (err) => {
    console.error("[worker] Uncaught exception:", err)
    void gracefulShutdown("SIGTERM")
  })
}
