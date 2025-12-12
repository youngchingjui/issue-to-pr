import { handler } from "@/../apps/workers/workflow-workers/src/handler"

jest.mock("@/../apps/workers/workflow-workers/src/orchestrators/createDependentPR", () => ({
  createDependentPR: jest.fn().mockResolvedValue("branch-xyz"),
}))

jest.mock("shared/entities/events/Job", () => {
  const actual = jest.requireActual("shared/entities/events/Job")
  return {
    ...actual,
  }
})

describe("workflow worker handler - createDependentPR", () => {
  it("routes createDependentPR jobs to orchestrator and returns branch name", async () => {
    const { createDependentPR } = require("@/../apps/workers/workflow-workers/src/orchestrators/createDependentPR")

    const job: any = {
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

