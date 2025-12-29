import type { Config } from "jest"

const baseConfig: Config = {
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/styles/(.*)$": "<rootDir>/styles/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1", 
    "^@/__tests__/(.*)$": "<rootDir>/__tests__/$1",
    "^@/shared/(.*)$": "<rootDir>/shared/src/$1",
    "^@shared/(.*)$": "<rootDir>/shared/src/$1",
    "^shared/(.*)$": "<rootDir>/shared/src/$1",
    "^apps/(.*)$": "<rootDir>/apps/$1",
    "^@workers/(.*)$": "<rootDir>/apps/workers/src/$1",
    "^@/adapters/(.*)$": "<rootDir>/shared/src/adapters/$1",
    "^@/entities/(.*)$": "<rootDir>/shared/src/entities/$1", 
    "^@/ports/(.*)$": "<rootDir>/shared/src/ports/$1",
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(shared|@octokit|universal-user-agent)/)"
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  rootDir: "../..",
}

export default baseConfig
