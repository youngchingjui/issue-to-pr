import dotenv from "dotenv"
import type { Config } from "jest"
import nextJest from "next/jest.js"
import path from "path"

import baseConfig from "./jest.config.base"

// Load e2e environment variables before tests run
dotenv.config({ path: path.resolve(__dirname, "../.env.neo4j") })

const createJestConfig = nextJest({
  dir: ".",
})

const config: Config = {
  ...baseConfig,
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.neo4j.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  displayName: "neo4j-integration",
  // Integration tests may take longer
  testTimeout: 30000,
}

export default createJestConfig(config)
