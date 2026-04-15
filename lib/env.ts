import { z } from "zod"

// Validated NextJS environment variables. Mirrors the worker's pattern in
// apps/workers/workflow-workers/src/schemas.ts. Add new required env vars here
// so they're enforced at runtime and typed at compile time.
//
// Shared code (`shared/`) must not read env directly — values flow in from
// here (NextJS) or from the worker's getEnvVar() (workers).
const envSchema = z.object({
  AGENT_BASE_IMAGE: z.string().min(1),
})

let cached: z.infer<typeof envSchema> | undefined

export function getEnv() {
  if (!cached) cached = envSchema.parse(process.env)
  return cached
}
