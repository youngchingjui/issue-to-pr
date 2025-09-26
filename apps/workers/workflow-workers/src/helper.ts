import dotenv from "dotenv"
import IORedis from "ioredis"
import path from "path"
import { JOB_STATUS_CHANNEL, JobStatusUpdateSchema } from "shared/entities"
import { fileURLToPath } from "url"

import { envSchema, type EnvVariables } from "./schemas"

let envLoaded = false

function loadEnvFromRepoRoot(): void {
  if (envLoaded) return

  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)
  const repoRoot = path.resolve(dirname, "../../../../")

  const envFilename =
    process.env.NODE_ENV === "production"
      ? ".env.production.local"
      : ".env.local"

  dotenv.config({ path: path.join(repoRoot, envFilename) })
  dotenv.config({ path: path.join(repoRoot, ".env") })

  envLoaded = true
}

export function ensureEnvLoaded(): void {
  loadEnvFromRepoRoot()
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
