import { z } from "zod"

import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"

// Should match .env.example
export const envSchema = z.object({
  BULLMQ_QUEUE_NAME: z.string().min(1).default(WORKFLOW_JOBS_QUEUE),
  ENVIRONMENT_NAME: z.string().optional(),
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_PRIVATE_KEY_PATH: z.string(),
  LANGFUSE_BASEURL: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().default("https://us.cloud.langfuse.com"),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  NEO4J_PASSWORD: z.string(),
  NEO4J_URI: z.string(),
  NEO4J_USER: z.string(),
  OPENAI_API_KEY: z.string(),
  REDIS_URL: z.string(),
  SHUTDOWN_TIMEOUT_MS: z.string().optional().default("3600000"),
  WEB_APP_URL: z.string().optional(),
  WORKER_CONCURRENCY: z.string().optional().default("1").transform(Number),
})

export type EnvVariables = z.infer<typeof envSchema>
