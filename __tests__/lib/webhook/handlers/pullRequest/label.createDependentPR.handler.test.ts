import { handlePullRequestLabelCreateDependentPR } from "@/lib/webhook/github/handlers/pullRequest/label.createDependentPR.handler"
import type { PullRequestPayload } from "@/lib/webhook/github/types"

describe("handlePullRequestLabelCreateDependentPR (noop)", () => {
  const installationId = "123456"

  function makePayload(overrides: Partial<PullRequestPayload> = {}): PullRequestPayload {
    return {
      action: "labeled",
      number: 42,
      label: { name: "I2PR: Update PR" },
      sender: { login: "octocat" },
      pull_request: { merged: false, head: { ref: "feature/foo" }, number: 42 },
      repository: { name: "repo", owner: { login: "owner" } },
      installation: { id: 999 },
      ...overrides,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("logs a noop message with expected context", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {})

    const payload = makePayload({ number: 100 })
    const result = await handlePullRequestLabelCreateDependentPR({ payload, installationId })

    expect(result).toEqual({
      status: "noop",
      repoFullName: "owner/repo",
      pullNumber: 100,
      githubLogin: "octocat",
      installationId,
    })

    expect(logSpy).toHaveBeenCalled()
    const message = (logSpy.mock.calls[0]?.[0] as string) ?? ""
    expect(message).toContain("Received PR label 'I2PR: Update PR'")
    expect(message).toContain("owner/repo#100")
    expect(message).toContain("octocat")

    logSpy.mockRestore()
  })

  it("throws if required fields are missing", async () => {
    await expect(
      handlePullRequestLabelCreateDependentPR({
        payload: makePayload({ repository: { name: "", owner: { login: "" } } }),
        installationId,
      })
    ).rejects.toThrow()
  })
})

