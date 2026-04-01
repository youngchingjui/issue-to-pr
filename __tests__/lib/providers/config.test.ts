/**
 * Provider config registry
 *
 * Requirements (docs/dev/branch-naming.md, docs/dev/multi-model-support.md):
 * - Every supported provider has a config entry
 * - Each provider produces a valid LLM adapter
 * - Each provider specifies a model for branch name generation
 * - Anthropic injects ANTHROPIC_API_KEY into container env
 * - OpenAI does not inject extra env vars (uses the worker-side agent pattern)
 */

import {
  createLLMAdapter,
  getBranchNameModel,
  getContainerEnvForProvider,
  PROVIDER_CONFIG,
} from "@/shared/lib/providers/config"

describe("provider config registry", () => {
  it("has a config entry for every supported provider", () => {
    expect(PROVIDER_CONFIG).toHaveProperty("openai")
    expect(PROVIDER_CONFIG).toHaveProperty("anthropic")
  })

  it.each(["openai", "anthropic"] as const)(
    "%s produces an LLM adapter with createCompletion",
    (provider) => {
      const adapter = createLLMAdapter(provider, "test-key")
      expect(adapter).toHaveProperty("createCompletion")
      expect(typeof adapter.createCompletion).toBe("function")
    }
  )

  it.each(["openai", "anthropic"] as const)(
    "%s specifies a branch name generation model",
    (provider) => {
      const model = getBranchNameModel(provider)
      expect(typeof model).toBe("string")
      expect(model.length).toBeGreaterThan(0)
    }
  )

  it("anthropic injects ANTHROPIC_API_KEY into container env", () => {
    const env = getContainerEnvForProvider("anthropic", "sk-ant-test")
    expect(env).toEqual({ ANTHROPIC_API_KEY: "sk-ant-test" })
  })

  it("openai does not inject extra container env vars", () => {
    const env = getContainerEnvForProvider("openai", "sk-openai-test")
    expect(env).toEqual({})
  })
})
