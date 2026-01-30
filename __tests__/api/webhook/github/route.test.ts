/**
 * @jest-environment node
 */
import crypto from "crypto"
import { NextRequest } from "next/server"

// Mock next-auth and GitHub modules to avoid ES module issues
jest.mock("@/auth", () => ({
  auth: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  handlers: {},
}))

jest.mock("@/lib/github", () => ({
  __esModule: true,
  default: jest.fn(),
  getOctokit: jest.fn(),
  getUserOctokit: jest.fn(),
  getInstallationOctokit: jest.fn(),
  getAppOctokit: jest.fn(),
}))

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
// Note: The PR-comment handler performs side effects (GitHub API calls, Redis enqueue, Neo4j lookups).
// In this routing test we only verify correct dispatching, so we mock the handler here to avoid
// heavy I/O and keep the test hermetic. The handler's own behavior is covered by dedicated unit tests
// in __tests__/lib/webhook/handlers/pullRequest/comment.authorizeWorkflow.handler.test.ts
jest.mock(
  "@/lib/webhook/github/handlers/pullRequest/comment.authorizeWorkflow.handler",
  () => ({
    handlePullRequestComment: jest.fn(),
  })
)
jest.mock(
  "@/lib/webhook/github/handlers/repository/edited.revalidateRepoCache.handler",
  () => ({
    handleRepositoryEditedRevalidate: jest.fn(),
  })
)
jest.mock(
  "@/lib/webhook/github/handlers/issue/label.autoResolveIssue.handler",
  () => ({
    handleIssueLabelAutoResolve: jest.fn(),
  })
)

import { POST } from "@/app/api/webhook/github/route"
import { revalidateUserInstallationReposCache } from "@/lib/webhook/github/handlers/installation/revalidateRepositoriesCache.handler"
import { handleIssueLabelAutoResolve } from "@/lib/webhook/github/handlers/issue/label.autoResolveIssue.handler"
import { handleIssueLabelResolve } from "@/lib/webhook/github/handlers/issue/label.resolve.handler"
import { handlePullRequestClosedRemoveContainer } from "@/lib/webhook/github/handlers/pullRequest/closed.removeContainer.handler"
import { handlePullRequestComment } from "@/lib/webhook/github/handlers/pullRequest/comment.authorizeWorkflow.handler"
import { handlePullRequestLabelCreateDependentPR } from "@/lib/webhook/github/handlers/pullRequest/label.createDependentPR.handler"
import { handleRepositoryEditedRevalidate } from "@/lib/webhook/github/handlers/repository/edited.revalidateRepoCache.handler"

describe("POST /api/webhook/github", () => {
  const secret = "test-secret"
  const originalSecret = process.env.GITHUB_WEBHOOK_SECRET

  beforeEach(() => {
    jest.resetAllMocks()
    process.env.GITHUB_WEBHOOK_SECRET = secret
    // Stub the PR-comment handler with a benign resolved value so routing assertions remain fast.
    jest
      .mocked(handlePullRequestComment)
      .mockResolvedValue({ status: "ignored", reason: "no_command" })
  })

  afterAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = originalSecret
  })

  // Helper function to create signed requests
  function createSignedRequest(
    payload: object,
    eventType: string,
    options: { invalidSignature?: boolean; noSignature?: boolean } = {}
  ): NextRequest {
    const rawBody = Buffer.from(JSON.stringify(payload))

    let signature: string | undefined
    if (!options.noSignature) {
      if (options.invalidSignature) {
        signature = "sha256=invalid_signature_here"
      } else {
        signature =
          "sha256=" +
          crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
      }
    }

    const headers = new Headers({
      "x-github-event": eventType,
    })
    if (signature) {
      headers.set("x-hub-signature-256", signature)
    }

    return {
      headers,
      arrayBuffer: jest.fn().mockResolvedValue(rawBody),
    } as unknown as NextRequest
  }

  describe("Security & Validation", () => {
    it("returns 500 when GITHUB_WEBHOOK_SECRET is not configured", async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET

      const payload = { action: "labeled" }
      const mockRequest = createSignedRequest(payload, "issues")

      const response = await POST(mockRequest)

      expect(response.status).toBe(500)
      const text = await response.text()
      expect(text).toBe("Webhook secret not configured")
    })

    it("returns 400 when x-github-event header is missing", async () => {
      const payload = { action: "labeled" }
      const rawBody = Buffer.from(JSON.stringify(payload))
      const signature =
        "sha256=" +
        crypto.createHmac("sha256", secret).update(rawBody).digest("hex")

      const headers = new Headers({
        "x-hub-signature-256": signature,
      })
      // No x-github-event header

      const mockRequest = {
        headers,
        arrayBuffer: jest.fn().mockResolvedValue(rawBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe("Missing event header")
    })

    it("returns 401 when signature is invalid", async () => {
      const payload = { action: "labeled" }
      const mockRequest = createSignedRequest(payload, "issues", {
        invalidSignature: true,
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toBe("Invalid signature")
    })

    it("returns 401 when signature is missing", async () => {
      const payload = { action: "labeled" }
      const mockRequest = createSignedRequest(payload, "issues", {
        noSignature: true,
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toBe("Invalid signature")
    })

    it("returns 401 when signature does not start with sha256=", async () => {
      const payload = { action: "labeled" }
      const rawBody = Buffer.from(JSON.stringify(payload))

      const headers = new Headers({
        "x-hub-signature-256": "sha1=wrong_algorithm",
        "x-github-event": "issues",
      })

      const mockRequest = {
        headers,
        arrayBuffer: jest.fn().mockResolvedValue(rawBody),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toBe("Invalid signature")
    })

    it("returns 400 when event type is unsupported", async () => {
      const payload = { action: "something" }
      const mockRequest = createSignedRequest(payload, "unsupported_event")

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe("Unsupported event")
    })

    it("returns 400 when issues payload is invalid", async () => {
      const invalidPayload = {
        action: "labeled",
        // Missing required fields like repository, issue, sender
      }
      const mockRequest = createSignedRequest(invalidPayload, "issues")

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe("Invalid payload")
    })

    it("returns 400 when issues payload is missing installation ID", async () => {
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
        // Missing installation field
      }
      const mockRequest = createSignedRequest(payload, "issues")

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      const text = await response.text()
      // Schema validation catches missing installation before manual check
      expect(text).toBe("Invalid payload")
    })

    it("returns 400 when pull_request payload is invalid", async () => {
      const invalidPayload = {
        action: "labeled",
        // Missing required fields
      }
      const mockRequest = createSignedRequest(invalidPayload, "pull_request")

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe("Invalid payload")
    })
  })

  describe("Issues Event Routing", () => {
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
      const mockRequest = createSignedRequest(payload, "issues")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)

      expect(handleIssueLabelAutoResolve).toHaveBeenCalledTimes(1)
      const callArgs = jest.mocked(handleIssueLabelAutoResolve).mock
        .calls[0]?.[0]
      expect(callArgs).toBeDefined()
      expect(callArgs.installationId).toBe(String(payload.installation.id))
      expect(callArgs.payload.repository.full_name).toBe(
        payload.repository.full_name
      )
      expect(callArgs.payload.issue.number).toBe(payload.issue.number)
      expect(callArgs.payload.sender.login).toBe(payload.sender.login)
    })

    it("routes resolve issue label payloads to the resolve handler", async () => {
      const payload = {
        action: "labeled",
        label: { name: "resolve" },
        repository: {
          id: 456,
          node_id: "R_kgDOTest2",
          full_name: "org/repo",
          name: "repo",
          owner: { login: "org" },
        },
        issue: { number: 99 },
        sender: { id: 2002, login: "user" },
        installation: { id: 5555 },
      }
      const mockRequest = createSignedRequest(payload, "issues")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)

      expect(handleIssueLabelResolve).toHaveBeenCalledTimes(1)
      const callArgs = jest.mocked(handleIssueLabelResolve).mock.calls[0]?.[0]
      expect(callArgs).toBeDefined()
      expect(callArgs.installationId).toBe(String(payload.installation.id))
      expect(callArgs.payload.repository.full_name).toBe(
        payload.repository.full_name
      )
      expect(callArgs.payload.issue.number).toBe(payload.issue.number)
    })

    it("ignores issues labeled with unhandled labels", async () => {
      const payload = {
        action: "labeled",
        label: { name: "bug" },
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
      const mockRequest = createSignedRequest(payload, "issues")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(handleIssueLabelAutoResolve).not.toHaveBeenCalled()
      expect(handleIssueLabelResolve).not.toHaveBeenCalled()
    })

    it("ignores issues with unhandled actions (opened, closed, etc.)", async () => {
      const payload = {
        action: "opened",
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
      const mockRequest = createSignedRequest(payload, "issues")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(handleIssueLabelAutoResolve).not.toHaveBeenCalled()
      expect(handleIssueLabelResolve).not.toHaveBeenCalled()
    })
  })

  describe("Pull Request Event Routing", () => {
    it("routes PR label 'I2PR: Update PR' payloads to createDependentPR handler", async () => {
      const payload = {
        action: "labeled",
        number: 42,
        label: { name: "I2PR: Update PR" },
        sender: { login: "octocat" },
        pull_request: {
          merged: false,
          head: { ref: "feature/foo" },
          number: 42,
        },
        repository: { name: "repo", owner: { login: "owner" } },
        installation: { id: 9876 },
      }
      const mockRequest = createSignedRequest(payload, "pull_request")

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

    it("routes closed+merged PR to removeContainer handler", async () => {
      const payload = {
        action: "closed",
        number: 123,
        sender: { login: "merger" },
        pull_request: {
          merged: true,
          head: { ref: "feature/test" },
          number: 123,
        },
        repository: { name: "repo", owner: { login: "owner" } },
        installation: { id: 7777 },
      }
      const mockRequest = createSignedRequest(payload, "pull_request")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)

      expect(handlePullRequestClosedRemoveContainer).toHaveBeenCalledTimes(1)
      const callArgs = jest.mocked(handlePullRequestClosedRemoveContainer).mock
        .calls[0]?.[0]
      expect(callArgs).toBeDefined()
      expect(callArgs.payload.pull_request?.merged).toBe(true)
      expect(callArgs.payload.number).toBe(payload.number)
    })

    it("does not call removeContainer handler when PR is closed but not merged", async () => {
      const payload = {
        action: "closed",
        number: 456,
        sender: { login: "closer" },
        pull_request: {
          merged: false,
          head: { ref: "feature/abandoned" },
          number: 456,
        },
        repository: { name: "repo", owner: { login: "owner" } },
        installation: { id: 8888 },
      }
      const mockRequest = createSignedRequest(payload, "pull_request")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(handlePullRequestClosedRemoveContainer).not.toHaveBeenCalled()
    })

    it("ignores PRs labeled with unhandled labels", async () => {
      const payload = {
        action: "labeled",
        number: 42,
        label: { name: "enhancement" },
        sender: { login: "octocat" },
        pull_request: {
          merged: false,
          head: { ref: "feature/foo" },
          number: 42,
        },
        repository: { name: "repo", owner: { login: "owner" } },
        installation: { id: 9876 },
      }
      const mockRequest = createSignedRequest(payload, "pull_request")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(handlePullRequestLabelCreateDependentPR).not.toHaveBeenCalled()
    })

    it("ignores PRs with unhandled actions (opened, synchronize, reopened)", async () => {
      const payload = {
        action: "opened",
        number: 789,
        sender: { login: "opener" },
        pull_request: {
          merged: false,
          head: { ref: "feature/new" },
          number: 789,
        },
        repository: { name: "repo", owner: { login: "owner" } },
        installation: { id: 3333 },
      }
      const mockRequest = createSignedRequest(payload, "pull_request")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(handlePullRequestClosedRemoveContainer).not.toHaveBeenCalled()
      expect(handlePullRequestLabelCreateDependentPR).not.toHaveBeenCalled()
    })
  })

  describe("Installation Event Routing", () => {
    it("routes installation events to revalidate cache handler", async () => {
      const payload = {
        action: "created",
        installation: { id: 12345 },
        sender: { login: "installer" },
      }
      const mockRequest = createSignedRequest(payload, "installation")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)

      expect(revalidateUserInstallationReposCache).toHaveBeenCalledTimes(1)
      const callArgs = jest.mocked(revalidateUserInstallationReposCache).mock
        .calls[0]?.[0]
      expect(callArgs).toBeDefined()
      expect(callArgs.installationId).toBe(String(payload.installation.id))
    })

    it("routes installation_repositories events to revalidate cache handler", async () => {
      const payload = {
        action: "added",
        installation: { id: 54321 },
        sender: { login: "repoAdder" },
        repositories_added: [{ id: 1, name: "repo1" }],
      }
      const mockRequest = createSignedRequest(
        payload,
        "installation_repositories"
      )

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)

      expect(revalidateUserInstallationReposCache).toHaveBeenCalledTimes(1)
      const callArgs = jest.mocked(revalidateUserInstallationReposCache).mock
        .calls[0]?.[0]
      expect(callArgs).toBeDefined()
      expect(callArgs.installationId).toBe(String(payload.installation.id))
    })
  })

  describe("Repository Event Routing", () => {
    it("routes repository edited events to revalidate handler", async () => {
      const payload = {
        action: "edited",
        repository: {
          full_name: "owner/edited-repo",
        },
        installation: { id: 1111 },
      }
      const mockRequest = createSignedRequest(payload, "repository")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)

      expect(handleRepositoryEditedRevalidate).toHaveBeenCalledTimes(1)
      const callArgs = jest.mocked(handleRepositoryEditedRevalidate).mock
        .calls[0]?.[0]
      expect(callArgs).toBeDefined()
      expect(callArgs.payload.repository.full_name).toBe(
        payload.repository.full_name
      )
      expect(callArgs.payload.action).toBe("edited")
    })

    it("returns 400 for repository events with unhandled actions", async () => {
      const payload = {
        action: "created",
        repository: {
          full_name: "owner/new-repo",
        },
        installation: { id: 2222 },
      }
      const mockRequest = createSignedRequest(payload, "repository")

      const response = await POST(mockRequest)

      // Schema only accepts "edited" action, so "created" fails validation
      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe("Invalid payload")
    })
  })

  describe("Issue Comment Routing", () => {
    it("routes issue_comment.created events to the PR comment handler", async () => {
      const payload = {
        action: "created",
        comment: {
          id: 123,
          body: "test",
          author_association: "OWNER",
          user: { login: "octocat", type: "User" },
        },
        issue: { number: 1, author_association: "OWNER", pull_request: {} },
        repository: { full_name: "owner/repo" },
        installation: { id: 9999 },
      }
      const mockRequest = createSignedRequest(payload, "issue_comment")

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(handlePullRequestComment).toHaveBeenCalledTimes(1)
    })
  })
})

