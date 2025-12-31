// Shared database ports for workflow runs visibility and attribution
// Shapes follow docs/internal/workflow-runs-tech-specs.md

export type CreateWorkflowRunInput = {
  id: string
  type: string // workflow type
  issueNumber?: number
  repoFullName?: string // Deprecated: use repository instead. Kept for backward compatibility.
  repository?: {
    id: number // GitHub numeric ID (immutable)
    nodeId: string // GitHub global node ID (immutable)
    fullName: string // owner/repo format (mutable)
    owner: string // Repository owner (mutable)
    name: string // Repository name (mutable)
    defaultBranch?: string // Default branch name
    visibility?: "PUBLIC" | "PRIVATE" | "INTERNAL"
    hasIssues?: boolean // Whether issues are enabled
  }
  postToGithub?: boolean
  actor:
    | { kind: "user"; userId: string; github?: { id?: string; login?: string } }
    | {
        kind: "webhook"
        source: "github"
        event?: "issues" | "pull_request"
        action?: "labeled" | "opened" | "closed"
        installationId?: string
        sender?: { id?: string; login?: string }
      }
}

export type WorkflowEventInput = {
  type: string // event discriminator
  payload: unknown
  createdAt?: string // ISO timestamp (optional)
}

export interface WorkflowRunContext {
  runId: string
  repoId?: string
  installationId?: string // also available via actor when kind=="webhook"
}

export interface WorkflowRunHandle {
  ctx: WorkflowRunContext
  append(event: WorkflowEventInput): Promise<void>
}

export type ListWorkflowRunsFilter =
  | {
      by: "initiator"
      user: { id: string; githubUserId?: string; githubLogin?: string }
    } // derives from actor.kind=="user"
  | { by: "repository"; repo: { id?: string; fullName: string } }
  | { by: "issue"; issue: { repoFullName: string; issueNumber: number } }

export type ListedWorkflowRun = {
  id: string
  type: string
  createdAt: string // ISO
  postToGithub?: boolean
  state: "running" | "completed" | "error" | "timedOut"
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

export interface WorkflowRunsRepository {
  list(filter: ListWorkflowRunsFilter): Promise<ListedWorkflowRun[]>
  getById(id: string): Promise<ListedWorkflowRun | null>
  listEvents(runId: string): Promise<WorkflowEventInput[]>
}

export interface DatabaseStorage {
  workflow: {
    run: {
      create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>
    }
  }
  runs: WorkflowRunsRepository
}
