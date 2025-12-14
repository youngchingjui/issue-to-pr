import { WORKFLOW_JOBS_QUEUE } from "shared/entities/Queue"
import * as jobService from "shared/services/job"

import { handleIssueLabelAutoResolve } from "@/lib/webhook/github/handlers/issue/label.autoResolveIssue.handler"
import type { IssuesPayload } from "@/lib/webhook/github/types"

jest.mock("shared/services/job", () => ({
  addJob: jest.fn(),
}))

describe("handleIssueLabelAutoResolve", () => {
  const originalEnv = process.env

  const buildPayload = (
    overrides: Partial<IssuesPayload> = {}
  ): IssuesPayload => ({
    action: "labeled",
    repository: { full_name: "octo/repo" },
    issue: { number: 42 },
    sender: { login: "octocat" },
    installation: { id: 99 },
    ...overrides,
  })

  beforeEach(() => {
    jest.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  it("enqueues autoResolveIssue job with expected data", async () => {
    const addJobSpy = jest
      .spyOn(jobService, "addJob")
      .mockResolvedValue("job-id-1")

    process.env.REDIS_URL = "redis://localhost:6379"

    const payload = buildPayload()

    await handleIssueLabelAutoResolve({ payload, installationId: "99" })

    expect(addJobSpy).toHaveBeenCalledTimes(1)
    expect(addJobSpy).toHaveBeenCalledWith(
      WORKFLOW_JOBS_QUEUE,
      {
        name: "autoResolveIssue",
        data: {
          repoFullName: "octo/repo",
          issueNumber: 42,
          githubLogin: "octocat",
          githubInstallationId: "99",
        },
      },
      {},
      "redis://localhost:6379"
    )
  })

  it("throws when REDIS_URL is missing", async () => {
    const payload = buildPayload()

    await expect(
      handleIssueLabelAutoResolve({ payload, installationId: "99" })
    ).rejects.toThrow("REDIS_URL is not set")
  })

  it("throws when required payload fields are missing", async () => {
    process.env.REDIS_URL = "redis://localhost:6379"

    const incompletePayload = {
      action: "labeled",
      repository: {},
      issue: {},
      sender: {},
      installation: {},
    } as unknown as IssuesPayload

    await expect(
      handleIssueLabelAutoResolve({
        payload: incompletePayload,
        installationId: "missing",
      })
    ).rejects.toThrow("Missing required fields for autoResolveIssue job")
  })
})
