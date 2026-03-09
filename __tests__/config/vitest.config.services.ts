/**
 * Vitest config for Service/Integration Tests
 *
 * Requires Docker services running (containers, Neo4j, Redis).
 * Command: pnpm test:services
 *
 * Uses Vitest instead of Jest for native ESM + TypeScript support.
 */

import path from "node:path"
import { fileURLToPath } from "node:url"

import dotenv from "dotenv"
import { defineConfig } from "vitest/config"

const dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, "../..")

// Load env files — integration tests need GitHub App credentials
// __tests__/.env.e2e has GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PATH, etc.
dotenv.config({ path: path.resolve(dirname, "../.env.e2e") })
dotenv.config({ path: path.resolve(rootDir, ".env.local") })

export default defineConfig({
  test: {
    include: [
      // Only vitest-compatible integration tests (Jest-based ones stay on jest)
      "__tests__/shared/lib/**/*.integration.test.ts",
    ],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Run serially to avoid race conditions with shared services
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      "@/shared": path.resolve(rootDir, "shared/src"),
      "@/lib": path.resolve(rootDir, "lib"),
      "@/components": path.resolve(rootDir, "components"),
      "@/__tests__": path.resolve(rootDir, "__tests__"),
      "@workers": path.resolve(rootDir, "apps/workers/src"),
      "@": rootDir,
    },
  },
})
