import type { AllEvents } from "@/shared/entities"
import {
  type UserActor,
  type WebhookActor,
  type WorkflowRun,
} from "@/shared/entities/WorkflowRun"

export interface DatabaseStorage {
  workflow: {
    run: {
      create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>
      getById(id: string): Promise<WorkflowRun | null>
      list(filter: WorkflowRunFilter): Promise<WorkflowRun[]>
      listEvents(runId: string): Promise<AllEvents[]>
    }
  }
}

export interface CreateWorkflowRunInput {
  id: string
  type: string
  issueNumber: number
  repository: {
    id?: number
    nodeId?: string
    fullName: string
    owner?: string
    name?: string
    defaultBranch?: string
    visibility?: "PUBLIC" | "PRIVATE" | "INTERNAL"
    hasIssues?: boolean
  }
  postToGithub: boolean
  actor: UserActor | WebhookActor
  // Optional: Commit information for the workflow run
  // MIGRATION NOTE: Should be provided whenever possible
  // Fetch from GitHub API: GET /repos/{owner}/{repo}/commits/{ref}
  // where ref is the default branch or specific branch/tag
  commit?: {
    sha: string // Git commit SHA (40 hex chars)
    nodeId: string // GitHub GraphQL node ID
    message: string // Commit message
    treeSha: string // Git tree SHA
    author: {
      name: string
      email: string
      date: string // ISO 8601 format
    }
    committer: {
      name: string
      email: string
      date: string // ISO 8601 format
    }
  }
}

export interface WorkflowRunHandle {
  id: string
}

export interface WorkflowRunFilter {
  userId?: string
  repositoryId?: string
  issueNumber?: number
}
