// TEMPLATE: Example of how to structure DTOs for application layer
// Remove this file once the real DTOs are implemented

// ✅ Request DTO - what the use case needs as input
export interface AutoResolveIssueRequest {
  issueNumber: number
  repoFullName: string
  jobId: string
  // ✅ Optional configuration
  options?: {
    createPR?: boolean
    postToGitHub?: boolean
    maxAttempts?: number
  }
}

// ✅ Response DTO - what the use case returns
export class AutoResolveIssueResponse {
  constructor(
    public readonly jobId: string,
    public readonly issueNumber: number,
    public readonly status: "started" | "queued" | "error",
    public readonly message?: string,
    public readonly estimatedCompletionTime?: Date
  ) {}

  // ✅ Helper methods for response handling
  isSuccessful(): boolean {
    return this.status === "started" || this.status === "queued"
  }

  toJSON() {
    return {
      jobId: this.jobId,
      issueNumber: this.issueNumber,
      status: this.status,
      message: this.message,
      estimatedCompletionTime: this.estimatedCompletionTime?.toISOString(),
    }
  }
}

// ✅ Additional DTOs for related operations
export interface GetWorkflowStatusRequest {
  jobId: string
}

export interface GetWorkflowStatusResponse {
  jobId: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number // 0-100
  currentStep?: string
  error?: string
  startTime: Date
  endTime?: Date
  artifacts?: {
    pullRequestUrl?: string
    branchName?: string
    commitHash?: string
  }
}

// ✅ Event DTOs for inter-layer communication
export interface AutoResolutionStartedEvent {
  type: "AutoResolutionStarted"
  jobId: string
  issueNumber: number
  repoFullName: string
  timestamp: Date
}

export interface AutoResolutionCompletedEvent {
  type: "AutoResolutionCompleted"
  jobId: string
  issueNumber: number
  repoFullName: string
  result: {
    success: boolean
    pullRequestUrl?: string
    error?: string
  }
  timestamp: Date
}
