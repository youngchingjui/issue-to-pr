import type { AllEvents } from "@/shared/entities"
import type { Result } from "@/shared/entities/result"
import {
  type WorkflowRun,
  type WorkflowRunActor,
  type WorkflowRunTypes,
} from "@/shared/entities/WorkflowRun"

export type Target = {
  issue?: { id?: string; number: number; repoFullName: string }
  ref?:
    | { type: "commit"; sha: string }
    | { type: "branch"; name: string }
    | { type: "tag"; name: string }
  repository?: {
    id?: number
    nodeId?: string
    owner?: string
    name?: string
    githubInstallationId?: string
  }
}
export type WorkflowRunConfig = {
  postToGithub?: boolean
}
export type WorkflowRunTrigger = { type: "ui" | "webhook" }

export interface CreateWorkflowRunInput {
  id?: string
  type: WorkflowRunTypes
  trigger?: WorkflowRunTrigger
  actor?: WorkflowRunActor
  target?: Target
  config?: WorkflowRunConfig
}

export interface WorkflowEventInput {
  type: AllEvents["type"]
  payload: unknown
  createdAt?: string
}

export interface RepositoryAttachment {
  id: number
  nodeId?: string
  fullName: string
  owner: string
  name: string
  githubInstallationId?: string
}

export interface IssueAttachment {
  number: number
  repoFullName: string
}

export interface CommitAttachment {
  sha: string
  nodeId?: string
  message?: string
}

export interface WorkflowRunHandle {
  readonly run: WorkflowRun
  add: {
    event(event: WorkflowEventInput): Promise<AllEvents>
  }
  attach: {
    target(target: Target): Promise<void>
    actor(actor: WorkflowRunActor): Promise<void>
    repository(repo: RepositoryAttachment): Promise<void>
    issue(issue: IssueAttachment): Promise<void>
    commit(commit: CommitAttachment): Promise<void>
  }
}

// Simple filter for basic queries
export interface WorkflowRunFilter {
  userId?: string
  repositoryId?: string
  issueNumber?: number
}

// Discriminated union filter for visibility-based queries
// Implements "initiator-or-owner" policy from PRD
export type ListWorkflowRunsFilter =
  | {
      by: "initiator"
      user: { id: string; githubUserId?: string; githubLogin?: string }
    }
  | { by: "repository"; repo: { id?: string; fullName: string } }
  | { by: "issue"; issue: { repoFullName: string; issueNumber: number } }

// Result type for visibility-based list queries
export type ListedWorkflowRun = {
  id: string
  type: string
  createdAt: string // ISO
  postToGithub?: boolean
  state: "pending" | "running" | "completed" | "error" | "timedOut"
  issue?: { repoFullName: string; number: number }
  actor?:
    | { kind: "user"; userId: string; github?: { id?: string; login?: string } }
    | {
        kind: "webhook"
        source: "github"
        installationId?: string
        sender?: { id?: string; login?: string }
      }
    | { kind: "system"; reason?: string }
  repository?: { id?: string; fullName: string }
}

export type SettingsError = "UserNotFound" | "Unknown"

export interface DatabaseStorage {
  workflow: {
    run: {
      create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>
      getById(id: string): Promise<WorkflowRun | null>
      list(filter: WorkflowRunFilter): Promise<WorkflowRun[]>
      // Visibility-based listing for workflow runs page
      listByVisibility(filter: ListWorkflowRunsFilter): Promise<ListedWorkflowRun[]>
    }
    events: {
      list(runId: string): Promise<AllEvents[]>
    }
  }
  settings: {
    user: {
      getOpenAIKey(
        userId: string
      ): Promise<Result<string | null, SettingsError>>
    }
  }
}
