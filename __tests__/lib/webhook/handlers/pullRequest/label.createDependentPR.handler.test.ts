import { handlePullRequestLabelCreateDependentPR } from "@/lib/webhook/github/handlers/pullRequest/label.createDependentPR.handler"
import type { PullRequestPayload } from "@/lib/webhook/github/types"
import { addJob } from "@/shared/services/job"

jest.mock("@/shared/services/job", () => ({
  addJob: jest.fn().mockResolvedValue("job-id-123"),
}))

describe("handlePullRequestLabelCreateDependentPR", () => {
  const installationId = "123456"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function makePayload(
    overrides: Partial<PullRequestPayload> = {}
  ): PullRequestPayload {
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

  it("enqueues a createDependentPR job with expected payload", async () => {
    const payload = makePayload({ number: 100 })

    process.env.REDIS_URL = "redis://localhost:6379"

    await handlePullRequestLabelCreateDependentPR({ payload, installationId })

    const mockedAddJob = jest.mocked(addJob)
    expect(mockedAddJob).toHaveBeenCalledTimes(1)
    const [queueName, jobEvent, _opts, redisUrl] = mockedAddJob.mock.calls[0]
    expect(queueName).toBe("workflow-jobs")
    expect(jobEvent.name).toBe("createDependentPR")
    expect(jobEvent.data).toEqual({
      repoFullName: "owner/repo",
      pullNumber: 100,
      githubLogin: "octocat",
      githubInstallationId: installationId,
    })
    expect(redisUrl).toBe("redis://localhost:6379")
  })

  it("handles valid payload correctly", async () => {
    process.env.REDIS_URL = "redis://localhost:6379"
    const payload = makePayload({ number: 42 })

    const result = await handlePullRequestLabelCreateDependentPR({
      payload,
      installationId,
    })

    expect(result.status).toBe("noop")
  })

  it("logs a noop message with expected context", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {})

    const payload = makePayload({ number: 100 })
    const result = await handlePullRequestLabelCreateDependentPR({
      payload,
      installationId,
    })

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

  it("throws if repository fields are missing", async () => {
    await expect(
      handlePullRequestLabelCreateDependentPR({
        payload: makePayload({
          repository: { name: "", owner: { login: "" } },
        }),
        installationId,
      })
    ).rejects.toThrow()
  })

  it("throws if REDIS_URL is not set", async () => {
    const original = process.env.REDIS_URL
    delete process.env.REDIS_URL

    await expect(
      handlePullRequestLabelCreateDependentPR({
        payload: makePayload(),
        installationId,
      })
    ).rejects.toThrow("REDIS_URL is not set")

    if (original) process.env.REDIS_URL = original
  })
})
