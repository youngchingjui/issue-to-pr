import type { Config } from "jest"

const baseConfig: Config = {
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.tests.json",
    },
  },
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  rootDir: "../..",
}

export default baseConfig

