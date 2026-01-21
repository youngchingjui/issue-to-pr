import type { Config } from "jest"

const baseConfig: Config = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/styles/(.*)$": "<rootDir>/styles/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/__tests__/(.*)$": "<rootDir>/__tests__/$1",
    "^@workers/(.*)$": "<rootDir>/apps/workers/src/$1",
    // Map explicit shared namespace to shared/src for imports like "@/shared/..."
    "^@/shared/(.*)$": "<rootDir>/shared/src/$1",
    // Convenience mapping for importing shared subpackages directly, e.g. "@/adapters/..."
    "^@/(adapters|entities|ports|providers|services|ui|usecases|utils)(/.*)?$":
      "<rootDir>/shared/src/$1$2",
    // Fallback to project root for any other alias
    "^@/(.*)$": "<rootDir>/$1",
  },
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  rootDir: "../..",
}

export default baseConfig
