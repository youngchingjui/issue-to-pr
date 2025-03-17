export interface TestConfig {
  useMockLLM: boolean
  useMockGithub: boolean
}

export const testConfig: TestConfig = {
  useMockLLM: process.env.USE_MOCK_LLM === "true",
  useMockGithub: process.env.USE_MOCK_GITHUB === "true",
}
