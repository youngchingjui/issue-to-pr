/**
 * @jest-environment node
 */
import { handleIssueLabelResolve } from "@/lib/webhook/github/handlers/issue/label.resolve.handler"
import type { IssuesPayload } from "@/lib/webhook/github/types"
import { webhookFixtures } from "@/__tests__/fixtures/github/webhooks"

// Mock dependencies
jest.mock("@/lib/github/content", () => ({
  getRepoFromString: jest.fn(),
}))

jest.mock("@/lib/github/issues", () => ({
  getIssue: jest.fn(),
}))

jest.mock("@/lib/neo4j", () => ({
  neo4jDs: {
    getSession: jest.fn(),
  },
}))

jest.mock("@/lib/neo4j/repositories/user", () => ({
  getUserByGithubLogin: jest.fn(),
}))

jest.mock("@/lib/redis-old", () => ({
  updateJobStatus: jest.fn(),
}))

jest.mock("@/lib/utils/utils-server", () => ({
  runWithInstallationId: jest.fn((installationId, callback) => callback()),
}))

jest.mock("@/lib/workflows/resolveIssue", () => ({
  resolveIssue: jest.fn(),
}))

jest.mock("@/shared/adapters/neo4j/repositories/SettingsReaderAdapter", () => ({
  makeSettingsReaderAdapter: jest.fn(),
}))

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { updateJobStatus } from "@/lib/redis-old"
import { runWithInstallationId } from "@/lib/utils/utils-server"
import { resolveIssue } from "@/lib/workflows/resolveIssue"
import { makeSettingsReaderAdapter } from "@/shared/adapters/neo4j/repositories/SettingsReaderAdapter"

describe("handleIssueLabelResolve", () => {
  const mockRepository = {
    owner: "test-owner",
    name: "test-repo",
    full_name: "test-owner/test-repo",
  }

  const mockIssue = {
    number: 42,
    title: "Test issue",
    body: "Test body",
    state: "open" as const,
    html_url: "https://github.com/test-owner/test-repo/issues/42",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns early when repository.full_name is missing", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.resolve,
      repository: {
        ...webhookFixtures.issues.labeled.resolve.repository,
        full_name: undefined as unknown as string,
      },
    } as IssuesPayload

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Missing repository.full_name")
    )
    expect(runWithInstallationId).not.toHaveBeenCalled()
  })

  it("returns early when issue.number is missing", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.resolve,
      issue: {
        ...webhookFixtures.issues.labeled.resolve.issue,
        number: undefined as unknown as number,
      },
    } as IssuesPayload

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Missing repository.full_name")
    )
    expect(runWithInstallationId).not.toHaveBeenCalled()
  })

  it("returns early when sender.login is missing", async () => {
    const payload = {
      ...webhookFixtures.issues.labeled.resolve,
      sender: {
        ...webhookFixtures.issues.labeled.resolve.sender,
        login: undefined as unknown as string,
      },
    } as IssuesPayload

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Missing sender.login")
    )
    expect(runWithInstallationId).not.toHaveBeenCalled()
  })

  it("returns early when OpenAI API key is missing", async () => {
    const payload = webhookFixtures.issues.labeled.resolve as IssuesPayload
    const mockSettingsReader = {
      getOpenAIKey: jest.fn().mockResolvedValue({ ok: false }),
    }
    jest.mocked(makeSettingsReaderAdapter).mockReturnValue(mockSettingsReader)

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(mockSettingsReader.getOpenAIKey).toHaveBeenCalledWith("label-adder")
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Missing OpenAI API key")
    )
    expect(runWithInstallationId).not.toHaveBeenCalled()
  })

  it("returns early when OpenAI API key value is null", async () => {
    const payload = webhookFixtures.issues.labeled.resolve as IssuesPayload
    const mockSettingsReader = {
      getOpenAIKey: jest.fn().mockResolvedValue({ ok: true, value: null }),
    }
    jest.mocked(makeSettingsReaderAdapter).mockReturnValue(mockSettingsReader)

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Missing OpenAI API key")
    )
    expect(runWithInstallationId).not.toHaveBeenCalled()
  })

  it("launches resolveIssue workflow when all conditions are met", async () => {
    const payload = webhookFixtures.issues.labeled.resolve as IssuesPayload
    const mockApiKey = "sk-test-api-key"
    const mockSettingsReader = {
      getOpenAIKey: jest.fn().mockResolvedValue({ ok: true, value: mockApiKey }),
    }

    jest.mocked(makeSettingsReaderAdapter).mockReturnValue(mockSettingsReader)
    jest.mocked(getRepoFromString).mockResolvedValue(mockRepository)
    jest.mocked(getIssue).mockResolvedValue({
      type: "success",
      issue: mockIssue,
    })
    jest.mocked(resolveIssue).mockResolvedValue(undefined)
    jest.mocked(updateJobStatus).mockResolvedValue(undefined)

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(runWithInstallationId).toHaveBeenCalledWith(
      "12345678",
      expect.any(Function)
    )
    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Received "resolve" label')
    )
    expect(getRepoFromString).toHaveBeenCalledWith("test-owner/test-repo")
    expect(getIssue).toHaveBeenCalledWith({
      fullName: "test-owner/test-repo",
      issueNumber: 42,
    })
    expect(resolveIssue).toHaveBeenCalledWith({
      issue: mockIssue,
      repository: mockRepository,
      apiKey: mockApiKey,
      jobId: expect.any(String),
      createPR: true,
    })
  })

  it("handles error when getIssue fails", async () => {
    const payload = webhookFixtures.issues.labeled.resolve as IssuesPayload
    const mockApiKey = "sk-test-api-key"
    const mockSettingsReader = {
      getOpenAIKey: jest.fn().mockResolvedValue({ ok: true, value: mockApiKey }),
    }

    jest.mocked(makeSettingsReaderAdapter).mockReturnValue(mockSettingsReader)
    jest.mocked(getRepoFromString).mockResolvedValue(mockRepository)
    jest.mocked(getIssue).mockResolvedValue({
      type: "error",
      error: "Issue not found",
    })
    jest.mocked(updateJobStatus).mockResolvedValue(undefined)

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(runWithInstallationId).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      "Failed to get issue:",
      expect.objectContaining({ type: "error" })
    )
    expect(resolveIssue).not.toHaveBeenCalled()
  })

  it("handles error when resolveIssue throws", async () => {
    const payload = webhookFixtures.issues.labeled.resolve as IssuesPayload
    const mockApiKey = "sk-test-api-key"
    const mockSettingsReader = {
      getOpenAIKey: jest.fn().mockResolvedValue({ ok: true, value: mockApiKey }),
    }
    const mockError = new Error("Workflow failed")

    jest.mocked(makeSettingsReaderAdapter).mockReturnValue(mockSettingsReader)
    jest.mocked(getRepoFromString).mockResolvedValue(mockRepository)
    jest.mocked(getIssue).mockResolvedValue({
      type: "success",
      issue: mockIssue,
    })
    jest.mocked(resolveIssue).mockRejectedValue(mockError)
    jest.mocked(updateJobStatus).mockResolvedValue(undefined)

    await handleIssueLabelResolve({
      payload,
      installationId: "12345678",
    })

    expect(runWithInstallationId).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to run resolveIssue workflow"),
      mockError
    )
  })
})
