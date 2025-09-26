import { z } from "zod"

// Should match .env.example
export const envSchema = z.object({
  REDIS_URL: z.string(),
  OPENAI_API_KEY: z.string(),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().optional().default(3600000),
})

export type EnvVariables = z.infer<typeof envSchema>
