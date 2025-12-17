import type { Config } from "jest"
import nextJest from "next/jest.js"

import baseConfig from "./jest.config.base"

const createJestConfig = nextJest({
  dir: ".",
})

const config: Config = {
  ...baseConfig,
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/lib/**/*.ts?(x)",
    "**/__tests__/api/**/*.ts?(x)",
    "**/__tests__/apps/**/*.ts?(x)",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/coverage/",
    "\\.llm\\.test\\.ts$", // Exclude LLM/manual tests by default
  ],
  displayName: "node",
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
}

export default createJestConfig(config)
