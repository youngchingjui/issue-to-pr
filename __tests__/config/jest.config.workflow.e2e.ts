import type { Config } from "jest"
import nextJest from "next/jest.js"

import baseConfig from "./jest.config.base"

const createJestConfig = nextJest({
  dir: ".",
})

const config: Config = {
  ...baseConfig,
  testEnvironment: "node",
  testMatch: ["**/__tests__/e2e/**/*.workflow.e2e.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  displayName: "workflow-e2e",
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  // Allow long-running agent workflow
  testTimeout: 20 * 60 * 1000, // 20 minutes
}

export default createJestConfig(config)

