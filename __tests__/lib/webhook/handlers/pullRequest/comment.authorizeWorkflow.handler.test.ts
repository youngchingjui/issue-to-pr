// Mock Neo4j data source to avoid env requirements during import time
jest.mock("@/lib/neo4j", () => ({
  neo4jDs: { getSession: () => ({}) },
}))

import { handlePullRequestComment } from "@/lib/webhook/github/handlers/pullRequest/comment.authorizeWorkflow.handler"

// Mocks
jest.mock("@/lib/github", () => ({
  getInstallationOctokit: jest.fn().mockResolvedValue({
    rest: {
      reactions: {
        createForIssueComment: jest.fn().mockResolvedValue({}),
      },
      issues: {
        createComment: jest.fn().mockResolvedValue({}),
      },
    },
  }),
}))

// StorageAdapter is instantiated in the handler. Replace its implementation with a controllable stub
type StorageMockResult =
  | { ok: true; value: string | null }
  | { ok: false; error: "UserNotFound" | "Unknown" }

const storageMockFactory = (result: StorageMockResult) => ({
  settings: {
    user: {
      getOpenAIKey: jest.fn().mockResolvedValue(result),
    },
  },
})

jest.mock("@/shared/adapters/neo4j/StorageAdapter", () => {
  return {
    StorageAdapter: jest.fn(),
  }
})

// Jobs service
jest.mock("@/shared/services/job", () => ({
  addJob: jest.fn().mockResolvedValue("job-123"),
}))

// uuid for deterministic workflowId
jest.mock("uuid", () => ({ v4: () => "11111111-2222-3333-4444-555555555555" }))

import { getInstallationOctokit } from "@/lib/github"
import { StorageAdapter } from "@/shared/adapters/neo4j/StorageAdapter"
import { addJob } from "@/shared/services/job"

const asMock = <T extends object>(fn: T) => jest.mocked(fn)

describe("handlePullRequestComment", () => {
  const baseParams = {
    installationId: 1234,
    commentId: 999,
    commentBody: "@issuetopr please run",
    commentUserType: "User" as const,
    authorAssociation: "OWNER" as const,
    issueNumber: 42,
    repoFullName: "owner/repo",
    isPullRequest: true,
    commenterLogin: "octocat",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_BASE_URL = "https://issuetopr.dev"
    process.env.REDIS_URL = "redis://localhost:6379"
  })

  it("ignores non-PR comments", async () => {
    const res = await handlePullRequestComment({ ...baseParams, isPullRequest: false })
    expect(res).toEqual({ status: "ignored", reason: "not_pr_comment" })
    expect(asMock(getInstallationOctokit)).not.toHaveBeenCalled()
  })

  it("ignores bot comments", async () => {
    const res = await handlePullRequestComment({ ...baseParams, commentUserType: "Bot" })
    expect(res).toEqual({ status: "ignored", reason: "not_human_user" })
  })

  it("ignores comments without the trigger keyword", async () => {
    const res = await handlePullRequestComment({ ...baseParams, commentBody: "hello world" })
    expect(res).toEqual({ status: "ignored", reason: "no_command" })
  })

  it("rejects non-OWNER commenters and posts an explanation", async () => {
    const res = await handlePullRequestComment({ ...baseParams, authorAssociation: "CONTRIBUTOR" })
    expect(res).toEqual({ status: "rejected", reason: "not_owner" })
    const { rest } = await getInstallationOctokit(0 as never)
    expect(rest.issues.createComment).toHaveBeenCalled()
  })

  it("returns error when commenterLogin is empty", async () => {
    const res = await handlePullRequestComment({ ...baseParams, commenterLogin: "" })
    expect(res).toEqual({ status: "error", reason: "missing_commenter_login" })
    expect(asMock(addJob)).not.toHaveBeenCalled()
  })

  it("returns error when commenterLogin is whitespace only", async () => {
    const res = await handlePullRequestComment({ ...baseParams, commenterLogin: "   " })
    expect(res).toEqual({ status: "error", reason: "missing_commenter_login" })
    expect(asMock(addJob)).not.toHaveBeenCalled()
  })

  it("posts account setup guidance when user not found in database", async () => {
    // Make StorageAdapter return err("UserNotFound")
    asMock(StorageAdapter as unknown as jest.Mock).mockImplementation(() =>
      storageMockFactory({ ok: false, error: "UserNotFound" })
    )

    const res = await handlePullRequestComment(baseParams)

    expect(res).toEqual({ status: "rejected", reason: "user_not_found" })
    const { rest } = await getInstallationOctokit(0 as never)
    expect(rest.issues.createComment).toHaveBeenCalled()
    expect(asMock(addJob)).not.toHaveBeenCalled()
  })

  it("posts guidance when API key is missing and does not enqueue a job", async () => {
    // Make StorageAdapter return ok(null) - user exists but no key
    asMock(StorageAdapter as unknown as jest.Mock).mockImplementation(() =>
      storageMockFactory({ ok: true, value: null })
    )

    const res = await handlePullRequestComment(baseParams)

    expect(res).toEqual({ status: "rejected", reason: "missing_api_key" })
    const { rest } = await getInstallationOctokit(0 as never)
    expect(rest.issues.createComment).toHaveBeenCalled()
    expect(asMock(addJob)).not.toHaveBeenCalled()
  })

  it("enqueues a createDependentPR job when authorized and API key exists", async () => {
    // Make StorageAdapter return ok("key")
    asMock(StorageAdapter as unknown as jest.Mock).mockImplementation(() =>
      storageMockFactory({ ok: true, value: "sk-abc" })
    )

    const res = await handlePullRequestComment(baseParams)

    expect(res?.status).toBe("enqueued")
    expect(asMock(addJob)).toHaveBeenCalledTimes(1)

    const { rest } = await getInstallationOctokit(0 as never)
    // A confirmation comment with a tracking link should be posted
    expect(rest.issues.createComment).toHaveBeenCalled()
    // Reactions on the comment should be created (eyes + rocket)
    expect(rest.reactions.createForIssueComment).toHaveBeenCalled()
  })
})

