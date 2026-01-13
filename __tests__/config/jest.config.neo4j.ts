import type { Config } from "jest"
import nextJest from "next/jest.js"

import baseConfig from "./jest.config.base"

const createJestConfig = nextJest({
  dir: ".",
})

const config: Config = {
  ...baseConfig,
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.neo4j.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  displayName: "neo4j-integration",
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  // Integration tests may take longer
  testTimeout: 30000,
}

export default createJestConfig(config)
