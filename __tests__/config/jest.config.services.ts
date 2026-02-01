/**
 * Jest config for Service Tests (Category 2: Local Infrastructure)
 *
 * Requires Docker services (Redis, Neo4j) to be running.
 * Run manually before deploy or in special CI workflow.
 *
 * Patterns: *.integration.test.ts, *.neo4j.test.ts
 * Command: pnpm test:services
 *
 * Setup:
 *   pnpm docker:up  # Start Redis and Neo4j
 */

import dotenv from "dotenv"
import type { Config } from "jest"
import nextJest from "next/jest.js"
import path from "path"

import baseConfig from "./jest.config.base"

// Load environment variables for services
dotenv.config({ path: path.resolve(__dirname, "../.env") })
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") })

const createJestConfig = nextJest({
  dir: ".",
})

// Remove preset from base config since nextJest handles it
const { preset: _, ...baseConfigWithoutPreset } = baseConfig

const config: Config = {
  ...baseConfigWithoutPreset,
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.integration.test.ts",
    "**/__tests__/**/*.neo4j.test.ts",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  displayName: "services",
  // Service tests may take longer due to DB operations
  testTimeout: 30000,
  // Run serially to avoid race conditions with shared services
  maxWorkers: 1,
}

export default createJestConfig(config)
