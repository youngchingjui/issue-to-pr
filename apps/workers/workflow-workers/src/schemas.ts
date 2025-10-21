import { z } from "zod"

// Should match .env.example
export const envSchema = z.object({
  REDIS_URL: z.string(),
  OPENAI_API_KEY: z.string(),
  SHUTDOWN_TIMEOUT_MS: z.string().optional().default("3600000"),
  // Number of concurrent jobs this worker process can run.
  // Keep as string in env and coerce at usage sites.
  WORKER_CONCURRENCY: z.string().optional().default("1"),
  NEO4J_URI: z.string(),
  NEO4J_USER: z.string(),
  NEO4J_PASSWORD: z.string(),
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_PRIVATE_KEY_PATH: z.string(),
})

export type EnvVariables = z.infer<typeof envSchema>

