/**
 * Branch naming — model routing
 *
 * Requirements (docs/dev/branch-naming.md):
 * - The branch naming use case is provider-agnostic: it accepts an LLM port
 * - Callers can specify which model to use via an optional `model` parameter
 * - When no model is specified, the adapter's default is used
 */

import type { GitHubRefsPort } from "@/shared/ports/github/branch.reader"
import type { LLMPort } from "@/shared/ports/llm"
import { generateNonConflictingBranchName } from "@/shared/usecases/git/generateBranchName"

function mockPorts(): {
  llm: LLMPort
  refs: GitHubRefsPort
  llmSpy: jest.SpyInstance
} {
  const llm: LLMPort = {
    createCompletion: async () => ({ ok: true as const, value: "test-branch" }),
  }
  const refs: GitHubRefsPort = {
    listBranches: async () => [],
  }
  const llmSpy = jest.spyOn(llm, "createCompletion")

  return { llm, refs, llmSpy }
}

describe("branch naming — model routing", () => {
  it("forwards the caller-specified model to the LLM adapter", async () => {
    const { llm, refs, llmSpy } = mockPorts()

    await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "web",
        context: "Fix a bug",
        prefix: "fix",
        model: "any-model-id",
        existingBranches: [],
      }
    )

    expect(llmSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: "any-model-id" })
    )
  })

  it("uses the adapter default when no model is specified", async () => {
    const { llm, refs, llmSpy } = mockPorts()

    await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "web",
        context: "Fix a bug",
        prefix: "fix",
        existingBranches: [],
      }
    )

    expect(llmSpy).toHaveBeenCalledWith(
      expect.objectContaining({ model: undefined })
    )
  })
})
