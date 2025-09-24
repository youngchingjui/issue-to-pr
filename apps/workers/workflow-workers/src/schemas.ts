import { z } from "zod"

// Should match .env.example
export const envSchema = z.object({
  REDIS_URL: z.string(),
  OPENAI_API_KEY: z.string(),
})

export type EnvVariables = z.infer<typeof envSchema>
