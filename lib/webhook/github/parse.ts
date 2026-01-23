import type { ZodError } from "zod"

import {
  type GithubEvent,
  GithubEventSchema,
  CreatePayloadSchema,
  DeletePayloadSchema,
  DeploymentPayloadSchema,
  DeploymentStatusPayloadSchema,
  InstallationPayloadSchema,
  InstallationRepositoriesPayloadSchema,
  IssueCommentPayloadSchema,
  IssuesPayloadSchema,
  PullRequestPayloadSchema,
  PullRequestReviewCommentPayloadSchema,
  PullRequestReviewPayloadSchema,
  PushPayloadSchema,
  RepositoryPayloadSchema,
  StatusPayloadSchema,
  WorkflowJobPayloadSchema,
  WorkflowRunPayloadSchema,
  type CreatePayload,
  type DeletePayload,
  type DeploymentPayload,
  type DeploymentStatusPayload,
  type InstallationPayload,
  type InstallationRepositoriesPayload,
  type IssueCommentPayload,
  type IssuesPayload,
  type PullRequestPayload,
  type PullRequestReviewCommentPayload,
  type PullRequestReviewPayload,
  type PushPayload,
  type RepositoryPayload,
  type StatusPayload,
  type WorkflowJobPayload,
  type WorkflowRunPayload,
} from "@/lib/webhook/github/types"

// Overloads provide strong typing per GitHub event
export function parseGithubWebhookPayload(
  event: "issue_comment",
  payload: unknown
): { ok: true; data: IssueCommentPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "issues",
  payload: unknown
): { ok: true; data: IssuesPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "pull_request",
  payload: unknown
): { ok: true; data: PullRequestPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "pull_request_review",
  payload: unknown
): { ok: true; data: PullRequestReviewPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "pull_request_review_comment",
  payload: unknown
):
  | { ok: true; data: PullRequestReviewCommentPayload }
  | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "push",
  payload: unknown
): { ok: true; data: PushPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "create",
  payload: unknown
): { ok: true; data: CreatePayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "delete",
  payload: unknown
): { ok: true; data: DeletePayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "status",
  payload: unknown
): { ok: true; data: StatusPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "deployment",
  payload: unknown
): { ok: true; data: DeploymentPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "deployment_status",
  payload: unknown
):
  | { ok: true; data: DeploymentStatusPayload }
  | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "workflow_run",
  payload: unknown
): { ok: true; data: WorkflowRunPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "workflow_job",
  payload: unknown
): { ok: true; data: WorkflowJobPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "installation",
  payload: unknown
): { ok: true; data: InstallationPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "installation_repositories",
  payload: unknown
):
  | { ok: true; data: InstallationRepositoriesPayload }
  | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: "repository",
  payload: unknown
): { ok: true; data: RepositoryPayload } | { ok: false; error: ZodError }
export function parseGithubWebhookPayload(
  event: GithubEvent,
  payload: unknown
): { ok: true; data: unknown } | { ok: false; error: ZodError } {
  // First, ensure the event is a supported value
  const eventCheck = GithubEventSchema.safeParse(event)
  if (!eventCheck.success) {
    throw new Error(`Unsupported GitHub event: ${String(event)}`)
  }

  switch (event) {
    case "issue_comment": {
      const r = IssueCommentPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "issues": {
      const r = IssuesPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "pull_request": {
      const r = PullRequestPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "pull_request_review": {
      const r = PullRequestReviewPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "pull_request_review_comment": {
      const r = PullRequestReviewCommentPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "push": {
      const r = PushPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "create": {
      const r = CreatePayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "delete": {
      const r = DeletePayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "status": {
      const r = StatusPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "deployment": {
      const r = DeploymentPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "deployment_status": {
      const r = DeploymentStatusPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "workflow_run": {
      const r = WorkflowRunPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "workflow_job": {
      const r = WorkflowJobPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "installation": {
      const r = InstallationPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "installation_repositories": {
      const r = InstallationRepositoriesPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    case "repository": {
      const r = RepositoryPayloadSchema.safeParse(payload)
      return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error }
    }
    default: {
      // Exhaustiveness guard
      const _exhaustive: never = event
      return { ok: false, error: _exhaustive as unknown as ZodError }
    }
  }
}

