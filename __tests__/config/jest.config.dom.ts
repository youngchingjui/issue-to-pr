import type { Config } from "jest"
import nextJest from "next/jest.js"

import baseConfig from "./jest.config.base"

const createJestConfig = nextJest({
  dir: "./",
})

const config: Config = {
  ...baseConfig,
  testEnvironment: "jest-environment-jsdom",
  testMatch: ["**/__tests__/components/**/*.ts?(x)"],
  displayName: "dom",
}

export default createJestConfig(config)
