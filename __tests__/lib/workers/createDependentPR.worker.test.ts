import { createDependentPR } from "apps/workers/workflow-workers/src/orchestrators/createDependentPR"

// Mock all external dependencies that make network calls
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
      repos: {
        get: jest.fn(),
        createFork: jest.fn(),
      },
      pulls: {
        create: jest.fn(),
      },
      git: {
        getRef: jest.fn(),
        createRef: jest.fn(),
      },
    },
  })),
}))

jest.mock("octokit", () => ({
  App: jest.fn().mockImplementation(() => ({
    getInstallationOctokit: jest.fn(),
  })),
}))

jest.mock(
  "apps/workers/workflow-workers/src/orchestrators/createDependentPR",
  () => ({
    createDependentPR: jest.fn().mockResolvedValue("branch-xyz"),
  })
)

import { handler, JobInput } from "apps/workers/workflow-workers/src/handler"

jest.mock("shared/entities/events/Job", () => {
  const actual = jest.requireActual("shared/entities/events/Job")
  return {
    ...actual,
  }
})

describe("workflow worker handler - createDependentPR", () => {
  it("routes createDependentPR jobs to orchestrator and returns branch name", async () => {
    const job: JobInput = {
      id: "job-123",
      name: "createDependentPR",
      data: {
        repoFullName: "owner/repo",
        pullNumber: 55,
        githubLogin: "octocat",
        githubInstallationId: "123",
      },
    }

    const result = await handler(job)

    expect(createDependentPR).toHaveBeenCalledTimes(1)
    expect(result).toBe("branch-xyz")
  })
})
