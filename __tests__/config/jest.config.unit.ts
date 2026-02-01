/**
 * Jest config for Unit Tests (Category 1: Free)
 *
 * Runs on every commit/PR in CI.
 * No external services required.
 *
 * Pattern: *.test.ts (excluding special suffixes)
 * Command: pnpm test
 *
 * Note: Component tests (jsdom) are excluded - run separately with:
 *   jest -c __tests__/config/jest.config.dom.ts
 */

import type { Config } from "jest"
import nextJest from "next/jest.js"

import baseConfig from "./jest.config.base"

const createJestConfig = nextJest({
  dir: ".",
})

// Remove preset from base config since nextJest handles it
const { preset: _, ...baseConfigWithoutPreset } = baseConfig

const config: Config = {
  ...baseConfigWithoutPreset,
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/lib/**/*.test.ts?(x)",
    "**/__tests__/api/**/*.test.ts?(x)",
    "**/__tests__/apps/**/*.test.ts?(x)",
    "**/__tests__/shared/**/*.test.ts?(x)",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    // Exclude all special test types (run via test:services or test:external)
    "\\.integration\\.test\\.ts$",
    "\\.neo4j\\.test\\.ts$",
    "\\.e2e\\.test\\.ts$",
    "\\.llm\\.test\\.ts$",
    "\\.openai\\.test\\.ts$",
    "\\.github\\.test\\.ts$",
  ],
  displayName: "unit",
}

export default createJestConfig(config)
