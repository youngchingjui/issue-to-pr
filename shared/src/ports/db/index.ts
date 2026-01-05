import type { AllEvents } from "@/shared/entities"
import {
  type WorkflowRun,
  type WorkflowRunActor,
  type WorkflowRunTypes,
} from "@/shared/entities/WorkflowRun"

export type Target = {
  issue?: { id: string; repoFullName: string }
  ref?:
    | { type: "commit"; sha: string }
    | { type: "branch"; name: string }
    | { type: "tag"; name: string }
  repository?: { fullName: string }
}
export type WorkflowRunConfig = {
  postToGithub?: boolean
}
export type WorkflowRunTrigger = { type: "ui" | "webhook" }

export interface CreateWorkflowRunInput {
  id?: string
  type: WorkflowRunTypes
  trigger: WorkflowRunTrigger
  actor?: WorkflowRunActor
  target?: Target
  config?: WorkflowRunConfig
}

export interface WorkflowEventInput {
  type: AllEvents["type"]
  payload: unknown
  createdAt?: string
}

export interface WorkflowRunHandle {
  readonly run: WorkflowRun
  add: {
    event(event: WorkflowEventInput): Promise<AllEvents>
  }
  attach: {
    target(target: Target): Promise<void>
    actor(actor: WorkflowRunActor): Promise<void>
  }
}

export interface WorkflowRunFilter {
  userId?: string
  repositoryId?: string
  issueNumber?: number
}

export interface DatabaseStorage {
  workflow: {
    run: {
      create(input: CreateWorkflowRunInput): Promise<WorkflowRunHandle>
      getById(id: string): Promise<WorkflowRun | null>
      list(filter: WorkflowRunFilter): Promise<WorkflowRun[]>
    }
    events: {
      list(runId: string): Promise<AllEvents[]>
    }
  }
}
