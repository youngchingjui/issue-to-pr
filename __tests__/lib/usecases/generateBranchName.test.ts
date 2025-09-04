// Jest tests for generateNonConflictingBranchName use case

import type { LLMPort } from "@shared/ports/llm"
import type { GitHubRefsPort } from "@shared/ports/refs"
import { generateNonConflictingBranchName } from "@shared/usecases/generateBranchName"

function mockPorts(overrides?: { llmText?: string; branches?: string[] }): {
  llm: LLMPort
  refs: GitHubRefsPort
  spies: { llm: jest.SpyInstance; refs: jest.SpyInstance }
} {
  const llmResp = overrides?.llmText ?? "sample-branch"
  const list = overrides?.branches ?? []

  const llm: LLMPort = {
    createCompletion: async () => llmResp,
  }
  const refs: GitHubRefsPort = {
    listBranches: async () => list,
  }

  const llmSpy = jest.spyOn(llm, "createCompletion")
  const refsSpy = jest.spyOn(refs, "listBranches")

  return { llm, refs, spies: { llm: llmSpy, refs: refsSpy } }
}

describe("generateNonConflictingBranchName", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns prefix + cleaned slug when no conflicts and existingBranches provided", async () => {
    const { llm, refs, spies } = mockPorts({ llmText: "add dark mode toggle" })

    const result = await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "web",
        context: "Add a dark mode toggle to settings page",
        prefix: "feature",
        existingBranches: ["main", "develop"],
      }
    )

    expect(result).toBe("feature/add-dark-mode-toggle")
    expect(spies.refs).not.toHaveBeenCalled()
    expect(spies.llm).toHaveBeenCalled()
  })

  it("increments numeric suffix until a unique branch is found", async () => {
    const base = "fix-login-bug"
    const candidate = `fix/${base}`
    const conflicts = [
      candidate,
      `${candidate}-2`,
      `${candidate}-3`,
      `${candidate}-4`,
    ]

    const { llm, refs } = mockPorts({ llmText: base })

    const result = await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "web",
        context: "Fix an issue where users cannot log in",
        prefix: "fix",
        existingBranches: conflicts,
      }
    )

    expect(result).toBe(`${candidate}-5`)
  })

  it("falls back to timestamp when maxAttempts is exhausted (no hard trimming)", async () => {
    const fixedNow = 1_725_000_000_000
    jest.spyOn(Date, "now").mockReturnValue(fixedNow)

    const base = "optimize-build-speed"
    const candidate = `chore/${base}`

    const { llm, refs } = mockPorts({ llmText: base })

    // Set maxAttempts to 1 so the numeric loop is skipped
    const result = await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "tooling",
        context: "Speed up the build pipeline",
        prefix: "chore",
        existingBranches: [candidate],
        maxAttempts: 1,
      }
    )

    expect(result).toBe(`${candidate}-${fixedNow}`)
  })

  it("cleans noisy LLM output and returns a kebab-case slug without prefix when not provided", async () => {
    const { llm, refs } = mockPorts({
      llmText: "Feature: Add / Payment flow!!!",
    })

    const result = await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "checkout",
        context: "Implement a new payment flow",
      }
    )

    expect(result).toBe("feature-add-payment-flow!!!")
  })

  it("normalizes a trailing slash in prefix", async () => {
    const { llm, refs } = mockPorts({ llmText: "improve-docs" })

    const result = await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "docs",
        context: "Polish documentation",
        prefix: "chore/", // trailing slash should be removed
      }
    )

    expect(result).toBe("chore/improve-docs")
  })

  it("uses refs.listBranches when existingBranches not provided", async () => {
    const { llm, refs, spies } = mockPorts({
      llmText: "refactor-components",
      branches: ["main"],
    })

    const result = await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "ui",
        context: "Refactor UI components",
        prefix: "chore",
      }
    )

    expect(spies.refs).toHaveBeenCalledWith({ owner: "acme", repo: "ui" })
    expect(result).toBe("chore/refactor-components")
  })

  it("does not trim the final branch name to a hard limit", async () => {
    const long = "a".repeat(500)
    const { llm, refs } = mockPorts({ llmText: long })

    const result = await generateNonConflictingBranchName(
      { llm, refs },
      {
        owner: "acme",
        repo: "monorepo",
        context: "Very verbose context",
        prefix: "feature",
      }
    )

    expect(result).toBe(`feature/${long}`)
  })
})
