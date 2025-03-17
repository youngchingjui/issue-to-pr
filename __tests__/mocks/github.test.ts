import { MockGithubClient } from "@/lib/mocks/MockGithubClient"

describe("MockGithubClient", () => {
  let githubClient: MockGithubClient

  beforeEach(() => {
    githubClient = new MockGithubClient()
  })

  describe("Issue operations", () => {
    it("should create an issue with default response", async () => {
      const params = {
        owner: "test-owner",
        repo: "test-repo",
        title: "Test Issue",
        body: "Test body",
      }

      const response = await githubClient.createIssue(params)
      expect(response.number).toBeDefined()
      expect(response.html_url).toContain("/issues/")

      const operations = githubClient.getOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0].type).toBe("createIssue")
      expect(operations[0].params).toEqual(params)
    })

    it("should create an issue with mock response", async () => {
      const mockResponse = {
        number: 123,
        html_url: "https://github.com/mock/test/issues/123",
      }
      githubClient.setMockResponse("createIssue", mockResponse)

      const response = await githubClient.createIssue({
        owner: "test-owner",
        repo: "test-repo",
        title: "Test Issue",
      })

      expect(response).toEqual(mockResponse)
    })
  })

  describe("Pull Request operations", () => {
    it("should create a pull request with default response", async () => {
      const params = {
        owner: "test-owner",
        repo: "test-repo",
        title: "Test PR",
        head: "feature-branch",
        base: "main",
      }

      const response = await githubClient.createPullRequest(params)
      expect(response.number).toBeDefined()
      expect(response.html_url).toContain("/pull/")

      const operations = githubClient.getOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0].type).toBe("createPullRequest")
      expect(operations[0].params).toEqual(params)
    })
  })

  describe("Branch operations", () => {
    it("should create a branch with default response", async () => {
      const params = {
        owner: "test-owner",
        repo: "test-repo",
        branch: "feature-branch",
      }

      const response = await githubClient.createBranch(params)
      expect(response.ref).toBe("refs/heads/feature-branch")
      expect(response.object.sha).toBeDefined()

      const operations = githubClient.getOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0].type).toBe("createBranch")
      expect(operations[0].params).toEqual(params)
    })
  })

  describe("Utility methods", () => {
    it("should clear operations", async () => {
      await githubClient.createIssue({
        owner: "test-owner",
        repo: "test-repo",
        title: "Test Issue",
      })

      expect(githubClient.getOperations()).toHaveLength(1)
      githubClient.clearOperations()
      expect(githubClient.getOperations()).toHaveLength(0)
    })
  })
})
