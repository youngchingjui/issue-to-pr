import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

import { envSchema, EnvVariables } from "./schemas"

let envLoaded = false

function loadEnvFromRepoRoot(): void {
  if (envLoaded) return

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const repoRoot = path.resolve(__dirname, "../../../../")

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
