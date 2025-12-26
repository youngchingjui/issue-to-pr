// Shared database ports and DTOs for workflow runs
// This file defines business-level interfaces the app and workers can use
// to persist and list workflow runs without coupling to a specific database.

export type WorkflowRunContext = {
  runId: string
  repoId?: string
  installationId?: string
}

export type WorkflowEventInput = {
  type: string
  payload: unknown
  createdAt?: string
}

export type CreateWorkflowRunInput = {
  id: string
  type: string
  issueNumber?: number
  repoFullName?: string
  postToGithub?: boolean
  initiatorUserId?: string
  initiatorGithubUserId?: string
  initiatorGithubLogin?: string
  triggerType?:
    | "app_ui"
    | "webhook_label_issue"
    | "webhook_label_pr"
    | "webhook_unknown"
  installationId?: string
}

export interface WorkflowRunHandle {
  ctx: WorkflowRunContext
  append(event: WorkflowEventInput): Promise<void>
}

export interface WorkflowRunsRepository {
  list(
    filter:
      | { by: "initiator"; initiatorGithubLogin: string }
      | { by: "repository"; repoFullName: string }
      | { by: "issue"; issue: { repoFullName: string; issueNumber: number } }
  ): Promise<unknown[]> // deliberately generic for now
}

export interface DatabaseStorage {
  workflow: {
    run: {
      create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>
    }
  }
}

