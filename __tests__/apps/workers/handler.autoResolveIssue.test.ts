// Mock @octokit packages to prevent ES module issues
jest.mock("@octokit/auth-app", () => ({
  createAppAuth: jest.fn(() => () => Promise.resolve({ token: "fake-token" })),
}))

jest.mock("@octokit/auth-oauth-user", () => ({
  createOAuthUserAuth: jest.fn(
    () => () => Promise.resolve({ token: "fake-token" })
  ),
}))

jest.mock("@octokit/graphql", () => ({
  graphql: jest.fn(),
}))

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      apps: { getInstallation: jest.fn() },
      repos: { get: jest.fn() },
    },
  })),
}))

jest.mock("octokit", () => ({
  App: jest.fn().mockImplementation(() => ({
    getInstallationOctokit: jest.fn(),
  })),
}))

jest.mock(
  "apps/workers/workflow-workers/src/orchestrators/autoResolveIssue",
  () => ({
    autoResolveIssue: jest.fn(),
  })
)

jest.mock("apps/workers/workflow-workers/src/helper", () => ({
  publishJobStatus: jest.fn(),
}))

import { handler } from "apps/workers/workflow-workers/src/handler"
import { publishJobStatus } from "apps/workers/workflow-workers/src/helper"
import { autoResolveIssue } from "apps/workers/workflow-workers/src/orchestrators/autoResolveIssue"
import type { Job } from "bullmq"

const mockAutoResolveIssue = jest.mocked(autoResolveIssue)
const mockPublishJobStatus = jest.mocked(publishJobStatus)

describe("handler - autoResolveIssue", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("routes autoResolveIssue jobs and publishes status updates", async () => {
    const messages = [
      { role: "assistant" as const, content: "first message" },
      { role: "assistant" as const, content: "second message" },
    ]
    mockAutoResolveIssue.mockResolvedValue(messages)

    const job = {
      id: "job-123",
      name: "autoResolveIssue",
      data: {
        repoFullName: "owner/repo",
        issueNumber: 42,
        branch: "feature-branch",
        githubLogin: "octocat",
        githubInstallationId: "install-1",
      },
    }

    const result = await handler(job as Job)

    expect(mockAutoResolveIssue).toHaveBeenCalledWith(job.id, job.data)
    expect(result).toBe("first message\nsecond message")
    expect(mockPublishJobStatus).toHaveBeenCalledWith(job.id, "Parsing job")
    expect(mockPublishJobStatus).toHaveBeenCalledWith(
      job.id,
      "Job: Auto resolve issue"
    )
    expect(mockPublishJobStatus).toHaveBeenCalledWith(
      job.id,
      "Completed: first message\nsecond message"
    )
  })
})
