/**
 * @jest-environment node
 */
import { handleIssueLabelAutoResolve } from "@/lib/webhook/github/handlers/issue/label.autoResolveIssue.handler"
import type { IssuesPayload } from "@/lib/webhook/github/types"
import { webhookFixtures } from "@/__tests__/fixtures/github/webhooks"
import { WORKFLOW_JOBS_QUEUE } from "@/shared/entities/Queue"

// Mock addJob
jest.mock("@/shared/services/job", () => ({
  addJob: jest.fn(),
}))

import { addJob } from "@/shared/services/job"

describe("handleIssueLabelAutoResolve", () => {
  const originalRedisUrl = process.env.REDIS_URL

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.REDIS_URL = "redis://localhost:6379"
  })

  afterAll(() => {
    process.env.REDIS_URL = originalRedisUrl
  })

  it("throws error when REDIS_URL is not set", async () => {
    delete process.env.REDIS_URL
    const payload = webhookFixtures.issues.labeled.autoResolve as IssuesPayload

    await expect(
      handleIssueLabelAutoResolve({
        payload,
        installationId: "12345678",
      })
    ).rejects.toThrow("REDIS_URL is not set")

    expect(addJob).not.toHaveBeenCalled()
  })

  it("throws error when repository.full_name is missing", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.autoResolve,
      repository: {
        ...webhookFixtures.issues.labeled.autoResolve.repository,
        full_name: undefined as unknown as string,
      },
    } as IssuesPayload

    await expect(
      handleIssueLabelAutoResolve({
        payload,
        installationId: "12345678",
      })
    ).rejects.toThrow("Missing required fields for autoResolveIssue job")

    expect(addJob).not.toHaveBeenCalled()
  })

  it("throws error when issue.number is missing", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.autoResolve,
      issue: {
        ...webhookFixtures.issues.labeled.autoResolve.issue,
        number: undefined as unknown as number,
      },
    } as IssuesPayload

    await expect(
      handleIssueLabelAutoResolve({
        payload,
        installationId: "12345678",
      })
    ).rejects.toThrow("Missing required fields for autoResolveIssue job")

    expect(addJob).not.toHaveBeenCalled()
  })

  it("throws error when issue.number is not a number", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.autoResolve,
      issue: {
        ...webhookFixtures.issues.labeled.autoResolve.issue,
        number: "not-a-number" as unknown as number,
      },
    } as IssuesPayload

    await expect(
      handleIssueLabelAutoResolve({
        payload,
        installationId: "12345678",
      })
    ).rejects.toThrow("Missing required fields for autoResolveIssue job")

    expect(addJob).not.toHaveBeenCalled()
  })

  it("throws error when sender.login is missing", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.autoResolve,
      sender: {
        ...webhookFixtures.issues.labeled.autoResolve.sender,
        login: undefined as unknown as string,
      },
    } as IssuesPayload

    await expect(
      handleIssueLabelAutoResolve({
        payload,
        installationId: "12345678",
      })
    ).rejects.toThrow("Missing required fields for autoResolveIssue job")

    expect(addJob).not.toHaveBeenCalled()
  })

  it("successfully enqueues autoResolveIssue job when all fields are present", async () => {
    const payload = webhookFixtures.issues.labeled.autoResolve as IssuesPayload
    jest.mocked(addJob).mockResolvedValue(undefined)

    await handleIssueLabelAutoResolve({
      payload,
      installationId: "12345678",
    })

    expect(addJob).toHaveBeenCalledTimes(1)
    expect(addJob).toHaveBeenCalledWith(
      WORKFLOW_JOBS_QUEUE,
      {
        name: "autoResolveIssue",
        data: {
          repoFullName: "test-owner/test-repo",
          issueNumber: 43,
          githubLogin: "repo-maintainer",
          githubInstallationId: "12345678",
        },
      },
      {},
      "redis://localhost:6379"
    )
  })

  it("handles addJob rejection (e.g., Redis connection failure)", async () => {
    const payload = webhookFixtures.issues.labeled.autoResolve as IssuesPayload
    const mockError = new Error("Redis connection failed")
    jest.mocked(addJob).mockRejectedValue(mockError)

    await expect(
      handleIssueLabelAutoResolve({
        payload,
        installationId: "12345678",
      })
    ).rejects.toThrow("Redis connection failed")

    expect(addJob).toHaveBeenCalledTimes(1)
  })

  it("enqueues job with correct queue and data structure", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.autoResolve,
      repository: {
        ...webhookFixtures.issues.labeled.autoResolve.repository,
        full_name: "custom-org/custom-repo",
      },
      issue: {
        ...webhookFixtures.issues.labeled.autoResolve.issue,
        number: 999,
      },
      sender: {
        ...webhookFixtures.issues.labeled.autoResolve.sender,
        login: "custom-user",
      },
    } as IssuesPayload

    jest.mocked(addJob).mockResolvedValue(undefined)

    await handleIssueLabelAutoResolve({
      payload,
      installationId: "99999999",
    })

    expect(addJob).toHaveBeenCalledWith(
      WORKFLOW_JOBS_QUEUE,
      {
        name: "autoResolveIssue",
        data: {
          repoFullName: "custom-org/custom-repo",
          issueNumber: 999,
          githubLogin: "custom-user",
          githubInstallationId: "99999999",
        },
      },
      {},
      "redis://localhost:6379"
    )
  })
})
