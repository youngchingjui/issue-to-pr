import type { Commit } from "./Commit"

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

export type WorkflowRunTypes =
  | "summarizeIssue"
  | "generateIssueTitle"
  | "resolveIssue"
  | "createDependentPR"
  | "reviewPullRequest"
  | "commentOnIssue"

export interface WorkflowRun {
  id: string
  type: WorkflowRunTypes
  createdAt: Date
  postToGithub: boolean
  state: "pending" | "running" | "completed" | "error" | "timedOut"
  issue?: { repoFullName: string; number: number }
  actor?: WorkflowRunActor
  repository?: { fullName: string }
  commit?: Commit
}
