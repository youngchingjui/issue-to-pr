interface GithubOperation<T = unknown> {
  type: string
  params: Record<string, unknown>
  result: T
}

interface IssueParams {
  owner: string
  repo: string
  title: string
  body?: string
  labels?: string[]
}

interface IssueResponse {
  number: number
  html_url: string
}

interface PullRequestParams {
  owner: string
  repo: string
  title: string
  head: string
  base: string
  body?: string
}

interface PullRequestResponse {
  number: number
  html_url: string
}

interface BranchParams {
  owner: string
  repo: string
  branch: string
  sha?: string
}

interface BranchResponse {
  ref: string
  object: {
    sha: string
  }
}

export class MockGithubClient {
  private operations: GithubOperation[] = []
  private mockResponses: Map<string, unknown> = new Map()

  // Issue operations
  async createIssue(params: IssueParams): Promise<IssueResponse> {
    const result = (this.getMockResponse("createIssue") as IssueResponse) || {
      number: Math.floor(Math.random() * 1000),
      html_url: `https://github.com/mock/repo/issues/${Math.floor(Math.random() * 1000)}`,
    }
    this.recordOperation("createIssue", this.objectToRecord(params), result)
    return result
  }

  async updateIssue(params: IssueParams): Promise<{ success: boolean }> {
    const result = (this.getMockResponse("updateIssue") as {
      success: boolean
    }) || {
      success: true,
    }
    this.recordOperation("updateIssue", this.objectToRecord(params), result)
    return result
  }

  // Pull Request operations
  async createPullRequest(
    params: PullRequestParams
  ): Promise<PullRequestResponse> {
    const result = (this.getMockResponse(
      "createPullRequest"
    ) as PullRequestResponse) || {
      number: Math.floor(Math.random() * 1000),
      html_url: `https://github.com/mock/repo/pull/${Math.floor(Math.random() * 1000)}`,
    }
    this.recordOperation(
      "createPullRequest",
      this.objectToRecord(params),
      result
    )
    return result
  }

  async updatePullRequest(
    params: PullRequestParams
  ): Promise<{ success: boolean }> {
    const result = (this.getMockResponse("updatePullRequest") as {
      success: boolean
    }) || {
      success: true,
    }
    this.recordOperation(
      "updatePullRequest",
      this.objectToRecord(params),
      result
    )
    return result
  }

  // Branch operations
  async createBranch(params: BranchParams): Promise<BranchResponse> {
    const result = (this.getMockResponse("createBranch") as BranchResponse) || {
      ref: `refs/heads/${params.branch}`,
      object: {
        sha: "mock-sha-" + Math.random().toString(36).substring(7),
      },
    }
    this.recordOperation("createBranch", this.objectToRecord(params), result)
    return result
  }

  // Utility methods for testing
  getOperations(): GithubOperation[] {
    return this.operations
  }

  clearOperations(): void {
    this.operations = []
  }

  setMockResponse<T>(operationType: string, response: T): void {
    this.mockResponses.set(operationType, response)
  }

  private getMockResponse(operationType: string): unknown {
    return this.mockResponses.get(operationType)
  }

  private recordOperation<T>(
    type: string,
    params: Record<string, unknown>,
    result: T
  ): void {
    this.operations.push({ type, params, result })
  }

  private objectToRecord(obj: object): Record<string, unknown> {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        acc[key] = value
        return acc
      },
      {} as Record<string, unknown>
    )
  }
}
