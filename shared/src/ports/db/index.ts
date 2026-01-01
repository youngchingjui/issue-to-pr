export interface DatabaseStorage {
  workflow: {
    run: {
      create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>
      getById(id: string): Promise<WorkflowRun | null>
      list(filter: WorkflowRunFilter): Promise<WorkflowRun[]>
      listEvents(runId: string): Promise<WorkflowEvent[]>
    }
  }
}

export interface CreateWorkflowRunInput {
  id: string
  type: string
  issueNumber: number
  repository: {
    id: number
    nodeId: string
    fullName: string
    owner: string
    name: string
    defaultBranch?: string
    visibility?: "PUBLIC" | "PRIVATE" | "INTERNAL"
    hasIssues?: boolean
  }
  postToGithub: boolean
  actor:
    | { kind: "user"; userId: string }
    | {
        kind: "webhook"
        source: "github"
        event: string
        action: string
        sender: { id: string; login: string }
        installationId: string
      }
    | { kind: "system" }
}

export interface WorkflowRunHandle {
  id: string
}

export interface WorkflowRun {
  id: string
  type: string
  createdAt: Date
  postToGithub: boolean
  state: "pending" | "running" | "completed" | "error" | "timedOut"
  issue?: { repoFullName: string; number: number }
  actor?: { kind: "user" | "webhook" | "system" }
  repository?: { fullName: string }
}

export interface WorkflowEvent {
  id: string
  type: string
  createdAt: Date
  data: unknown
}

export interface WorkflowRunFilter {
  userId?: string
  repositoryId?: string
  issueNumber?: number
}
