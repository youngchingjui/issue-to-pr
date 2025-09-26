import dotenv from "dotenv"
import IORedis from "ioredis"
import path from "path"
import { JOB_STATUS_CHANNEL, JobStatusUpdateSchema } from "shared/entities"
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

  const redis = new IORedis(REDIS_URL)
  const jobStatusUpdate = JobStatusUpdateSchema.parse({ jobId, status })
  await redis.publish(JOB_STATUS_CHANNEL, JSON.stringify(jobStatusUpdate))
}
