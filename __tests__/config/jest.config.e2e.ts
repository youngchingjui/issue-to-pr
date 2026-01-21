import dotenv from "dotenv"
import type { Config } from "jest"
import nextJest from "next/jest.js"
import path from "path"

import baseConfig from "./jest.config.base"

// Load e2e environment variables before tests run
dotenv.config({ path: path.resolve(__dirname, "../.env.e2e") })

const createJestConfig = nextJest({
  dir: ".",
})

const config: Config = {
  ...baseConfig,
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.e2e.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  displayName: "e2e",
  // E2E tests require longer timeouts for real services
  testTimeout: 120000,
  // Run tests serially to avoid race conditions with shared services
  maxWorkers: 1,
}

export default createJestConfig(config)
