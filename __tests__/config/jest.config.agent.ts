import type { Config } from "jest"
import nextJest from "next/jest.js"

import baseConfig from "./jest.config.base"

const createJestConfig = nextJest({
  dir: ".",
})

const config: Config = {
  ...baseConfig,
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.llm.test.ts"],
  displayName: "agent",
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
}

export default createJestConfig(config)
