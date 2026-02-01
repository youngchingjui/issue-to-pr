/**
 * Jest config for External Tests (Category 3: API Calls)
 *
 * Makes real API calls to external services.
 * Costs money (LLM tokens) or uses API rate limits.
 * Run manually and carefully.
 *
 * Patterns:
 *   *.openai.test.ts  - OpenAI/LLM API calls
 *   *.github.test.ts  - GitHub API calls
 *   *.llm.test.ts     - Legacy LLM tests (same as openai)
 *   *.e2e.test.ts     - End-to-end tests (touches multiple external services)
 *
 * Command: pnpm test:external
 *
 * Setup:
 *   Ensure API keys are configured in .env.local
 *   OPENAI_API_KEY, GITHUB_TOKEN, etc.
 */

import dotenv from "dotenv"
import type { Config } from "jest"
import nextJest from "next/jest.js"
import path from "path"

import baseConfig from "./jest.config.base"

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.e2e") })
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
    "**/__tests__/**/*.openai.test.ts",
    "**/__tests__/**/*.github.test.ts",
    "**/__tests__/**/*.llm.test.ts",
    "**/__tests__/**/*.e2e.test.ts",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  displayName: "external",
  // External tests need longer timeouts for API calls
  testTimeout: 120000,
  // Run serially to avoid rate limiting
  maxWorkers: 1,
}

export default createJestConfig(config)
