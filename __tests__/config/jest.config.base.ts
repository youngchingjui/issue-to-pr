import type { Config } from "jest"

const baseConfig: Config = {
  setupFilesAfterEnv: ["<rootDir>/__tests__/jest.setup.ts"],
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/styles/(.*)$": "<rootDir>/styles/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/__tests__/(.*)$": "<rootDir>/__tests__/$1",
    "^@shared/(.*)$": "<rootDir>/shared/src/$1",
    "^shared/(.*)$": "<rootDir>/shared/src/$1",
    "^@workers/(.*)$": "<rootDir>/apps/workers/src/$1",

    // NEW: allow direct `shared/...` imports in tests
    "^shared/(.*)$": "<rootDir>/shared/src/$1",
  },
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  rootDir: "../..",
}

export default baseConfig
