/**
 * Load .env files into process.env at module-import time.
 *
 * Must be the FIRST import in the worker entrypoint so env vars are available
 * before any module with top-level `process.env` reads runs. In particular,
 * `shared/src/lib/types/docker.ts` captures `AGENT_BASE_IMAGE` at import time
 * via `const AGENT_BASE_IMAGE = process.env.AGENT_BASE_IMAGE ?? DEFAULT`, so
 * any lazy env loading happens too late to affect its value.
 *
 * This file deliberately has no `@/shared/*` imports — adding one would risk
 * pulling in modules that read env at load time before this file runs.
 */

import dotenv from "dotenv"
import path from "path"

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
  dotenv.config({ path: path.join(process.cwd(), envFile) })
}
