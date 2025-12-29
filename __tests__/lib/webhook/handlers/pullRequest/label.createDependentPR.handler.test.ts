import { handlePullRequestLabelCreateDependentPR } from "@/lib/webhook/github/handlers/pullRequest/label.createDependentPR.handler"
import type { PullRequestPayload } from "@/lib/webhook/github/types"

jest.mock("shared/services/job", () => ({
  addJob: jest.fn().mockResolvedValue("job-id-123"),
}))

describe("handlePullRequestLabelCreateDependentPR", () => {
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
    process.env.REDIS_URL = "redis://localhost:6379"
  })

  afterEach(() => {
    delete process.env.REDIS_URL
  })

  it("enqueues a createDependentPR job with expected payload", async () => {
    const { addJob } = require("shared/services/job")
    const payload = makePayload({ number: 100 })

    await handlePullRequestLabelCreateDependentPR({ payload, installationId })

    expect(addJob).toHaveBeenCalledTimes(1)
    const [queueName, job, _opts, _redisUrl] = addJob.mock.calls[0]
    expect(job.name).toBe("createDependentPR")
    expect(job.data).toEqual({
      repoFullName: "owner/repo",
      pullNumber: 100,
      githubLogin: "octocat",
      githubInstallationId: installationId,
    })
  })

  it("throws if required fields are missing", async () => {
    await expect(
      handlePullRequestLabelCreateDependentPR({
        payload: makePayload({ repository: { name: "", owner: { login: "" } } }),
        installationId,
      })
    ).rejects.toThrow()
  })

  it("throws if REDIS_URL is not set", async () => {
    delete process.env.REDIS_URL

    await expect(
      handlePullRequestLabelCreateDependentPR({
        payload: makePayload(),
        installationId,
      })
    ).rejects.toThrow("REDIS_URL is not set")
  })
})