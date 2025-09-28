import { z } from "zod"

// Should match .env.example
export const envSchema = z.object({
  REDIS_URL: z.string(),
  OPENAI_API_KEY: z.string().optional(),
  SHUTDOWN_TIMEOUT_MS: z.string().optional().default("3600000"),
  NEO4J_URI: z.string().optional(),
  NEO4J_USER: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_INSTALLATION_ID: z.string().optional(),
})

export type EnvVariables = z.infer<typeof envSchema>

