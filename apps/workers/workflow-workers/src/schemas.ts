import { z } from "zod"

import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"

// Should match .env.example
export const envSchema = z.object({
  REDIS_URL: z.string(),
  OPENAI_API_KEY: z.string(),
  SHUTDOWN_TIMEOUT_MS: z.string().optional().default("3600000"),
  WORKER_CONCURRENCY: z.string().optional().default("1").transform(Number),
  NEO4J_URI: z.string(),
  NEO4J_USER: z.string(),
  NEO4J_PASSWORD: z.string(),
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_PRIVATE_KEY_PATH: z.string(),
  WEB_APP_URL: z.string().optional(),
  ENVIRONMENT_NAME: z.string().optional(),
  BULLMQ_QUEUE_NAME: z.string().optional().default(WORKFLOW_JOBS_QUEUE),
})

export type EnvVariables = z.infer<typeof envSchema>
