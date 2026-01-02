/**
 * @jest-environment node
 */
import crypto from "crypto"
import { NextRequest } from "next/server"

jest.mock(
  "@/lib/webhook/github/handlers/installation/revalidateRepositoriesCache.handler",
  () => ({
    revalidateUserInstallationReposCache: jest.fn(),
  })
)
jest.mock("@/lib/webhook/github/handlers/issue/label.resolve.handler", () => ({
  handleIssueLabelResolve: jest.fn(),
}))
jest.mock(
  "@/lib/webhook/github/handlers/pullRequest/closed.removeContainer.handler",
  () => ({
    handlePullRequestClosedRemoveContainer: jest.fn(),
  })
)
jest.mock(
  "@/lib/webhook/github/handlers/pullRequest/label.createDependentPR.handler",
  () => ({
    handlePullRequestLabelCreateDependentPR: jest.fn(),
  })
)
jest.mock(
  "@/lib/webhook/github/handlers/repository/edited.revalidateRepoCache.handler",
  () => ({
    handleRepositoryEditedRevalidate: jest.fn(),
  })
)
import { POST } from "@/app/api/webhook/github/route"
import { handleIssueLabelAutoResolve } from "@/lib/webhook/github/handlers/issue/label.autoResolveIssue.handler"
import { handlePullRequestLabelCreateDependentPR } from "@/lib/webhook/github/handlers/pullRequest/label.createDependentPR.handler"

jest.mock(
  "@/lib/webhook/github/handlers/issue/label.autoResolveIssue.handler",
  () => ({
    handleIssueLabelAutoResolve: jest.fn(),
  })
)

describe("POST /api/webhook/github", () => {
  const secret = "test-secret"
  const originalSecret = process.env.GITHUB_WEBHOOK_SECRET

  beforeEach(() => {
    jest.resetAllMocks()
    process.env.GITHUB_WEBHOOK_SECRET = secret
  })

  afterAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = originalSecret
  })

  it("routes i2pr resolve issue label payloads to the auto-resolve handler", async () => {
    const payload = {
      action: "labeled",
      label: { name: "i2pr: resolve issue" },
      repository: {
        id: 123,
        node_id: "R_kgDOTest",
        full_name: "octo-org/octo-repo",
        name: "octo-repo",
        owner: { login: "octo-org" },
      },
      issue: { number: 42 },
      sender: { id: 1001, login: "octocat" },
      installation: { id: 9876 },
    }

    const rawBody = Buffer.from(JSON.stringify(payload))
    const signature =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(rawBody).digest("hex")

    const headers = new Headers({
      "x-hub-signature-256": signature,
      "x-github-event": "issues",
    })

    const mockRequest = {
      headers,
      arrayBuffer: jest.fn().mockResolvedValue(rawBody),
    } as unknown as NextRequest

    const response = await POST(mockRequest)

    expect(response.status).toBe(200)

    expect(handleIssueLabelAutoResolve).toHaveBeenCalledTimes(1)
    const callArgs = jest.mocked(handleIssueLabelAutoResolve).mock.calls[0]?.[0]
    expect(callArgs).toBeDefined()
    expect(callArgs.installationId).toBe(String(payload.installation.id))
    expect(callArgs.payload.repository.full_name).toBe(
      payload.repository.full_name
    )
    expect(callArgs.payload.issue.number).toBe(payload.issue.number)
    expect(callArgs.payload.sender.login).toBe(payload.sender.login)
  })

  it("routes PR label 'I2PR: Update PR' payloads to createDependentPR handler", async () => {
    const payload = {
      action: "labeled",
      number: 42,
      label: { name: "I2PR: Update PR" },
      sender: { login: "octocat" },
      pull_request: { merged: false, head: { ref: "feature/foo" }, number: 42 },
      repository: { name: "repo", owner: { login: "owner" } },
      installation: { id: 9876 },
    }

    const rawBody = Buffer.from(JSON.stringify(payload))
    const signature =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(rawBody).digest("hex")

    const headers = new Headers({
      "x-hub-signature-256": signature,
      "x-github-event": "pull_request",
    })

    const mockRequest = {
      headers,
      arrayBuffer: jest.fn().mockResolvedValue(rawBody),
    } as unknown as NextRequest

    const response = await POST(mockRequest)

    expect(response.status).toBe(200)

    expect(handlePullRequestLabelCreateDependentPR).toHaveBeenCalledTimes(1)
    const callArgs = jest.mocked(handlePullRequestLabelCreateDependentPR).mock
      .calls[0]?.[0]
    expect(callArgs).toBeDefined()
    expect(callArgs.installationId).toBe(String(payload.installation.id))
    expect(callArgs.payload.number).toBe(payload.number)
    expect(callArgs.payload.label?.name).toBe(payload.label.name)
    expect(callArgs.payload.sender?.login).toBe(payload.sender.login)
  })
})
