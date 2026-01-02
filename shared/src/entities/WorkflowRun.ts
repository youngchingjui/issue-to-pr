import { Commit } from "./Commit"

export interface UserActor {
  type: "user"
  userId: string
}

export interface WebhookActor {
  type: "webhook"
  source: "github"
  event: string
  action: string
  sender: { id: string; login: string }
  installationId: string
}

export type WorkflowRunActor = UserActor | WebhookActor

export interface WorkflowRun {
  id: string
  type: string
  createdAt: Date
  postToGithub: boolean
  state: "pending" | "running" | "completed" | "error" | "timedOut"
  issue?: { repoFullName: string; number: number }
  actor?: WorkflowRunActor
  repository?: { fullName: string }
  commit?: Commit
}
