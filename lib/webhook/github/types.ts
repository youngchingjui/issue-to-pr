// Webhook event types and routing contracts
import { z } from "zod"

export const GithubEventSchema = z.enum([
  "issues",
  "pull_request",
  "push",
  "create",
  "delete",
  "status",
  "issue_comment",
  "deployment",
  "deployment_status",
  "workflow_run",
  "workflow_job",
  "installation",
  "installation_repositories",
  "repository",
])
export type GithubEvent = z.infer<typeof GithubEventSchema>

// Common fields present on GitHub App webhooks (required for this app)
const InstallationSchema = z.object({ id: z.number() })

export const IssuesPayloadSchema = z.object({
  action: z.string(),
  label: z.object({ name: z.string() }).optional(),
  repository: z.object({
    id: z.number(),
    node_id: z.string(),
    full_name: z.string(),
    name: z.string(),
    owner: z.object({ login: z.string() }),
    default_branch: z.string().optional(),
    visibility: z.enum(["public", "private", "internal"]).optional(),
    has_issues: z.boolean().optional(),
  }),
  issue: z.object({ number: z.number() }),
  sender: z.object({
    id: z.number(),
    login: z.string(),
  }),
  installation: InstallationSchema,
})
export type IssuesPayload = z.infer<typeof IssuesPayloadSchema>

export const PullRequestPayloadSchema = z.object({
  action: z.string(),
  number: z.number().optional(),
  label: z.object({ name: z.string() }).optional(),
  pull_request: z.object({
    merged: z.boolean().optional(),
    head: z.object({ ref: z.string() }).optional(),
    number: z.number().optional(),
  }),
  repository: z.object({
    name: z.string(),
    owner: z.object({ login: z.string() }),
  }),
  sender: z.object({ login: z.string() }).optional(),
  installation: InstallationSchema,
})
export type PullRequestPayload = z.infer<typeof PullRequestPayloadSchema>

export const PushPayloadSchema = z.object({
  ref: z.string(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type PushPayload = z.infer<typeof PushPayloadSchema>

// Additional event payload schemas (minimal fields required for now)
export const CreatePayloadSchema = z.object({
  ref: z.string().nullable().optional(),
  ref_type: z.enum(["branch", "tag"]).optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type CreatePayload = z.infer<typeof CreatePayloadSchema>

export const DeletePayloadSchema = z.object({
  ref: z.string(),
  ref_type: z.enum(["branch", "tag"]).optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type DeletePayload = z.infer<typeof DeletePayloadSchema>

export const StatusPayloadSchema = z.object({
  state: z.string(),
  context: z.string().optional(),
  sha: z.string().optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type StatusPayload = z.infer<typeof StatusPayloadSchema>

export const IssueCommentPayloadSchema = z.object({
  action: z.string(),
  issue: z
    .object({ number: z.number(), pull_request: z.unknown().optional() })
    .optional(),
  comment: z
    .object({
      id: z.number(),
      body: z.string().optional(),
      user: z.object({ login: z.string() }).optional(),
    })
    .optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type IssueCommentPayload = z.infer<typeof IssueCommentPayloadSchema>

export const DeploymentPayloadSchema = z.object({
  action: z.string(),
  deployment: z
    .object({ id: z.number().optional(), environment: z.string().optional() })
    .optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type DeploymentPayload = z.infer<typeof DeploymentPayloadSchema>

export const DeploymentStatusPayloadSchema = z.object({
  action: z.string(),
  deployment_status: z
    .object({ id: z.number().optional(), state: z.string().optional() })
    .optional(),
  deployment: z.object({ id: z.number().optional() }).optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type DeploymentStatusPayload = z.infer<
  typeof DeploymentStatusPayloadSchema
>

export const WorkflowRunPayloadSchema = z.object({
  action: z.string(),
  workflow_run: z
    .object({ id: z.number().optional(), event: z.string().optional() })
    .optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type WorkflowRunPayload = z.infer<typeof WorkflowRunPayloadSchema>

export const WorkflowJobPayloadSchema = z.object({
  action: z.string(),
  workflow_job: z
    .object({ id: z.number().optional(), status: z.string().optional() })
    .optional(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type WorkflowJobPayload = z.infer<typeof WorkflowJobPayloadSchema>

export const InstallationPayloadSchema = z.object({
  action: z.string(),
  installation: InstallationSchema,
})
export type InstallationPayload = z.infer<typeof InstallationPayloadSchema>

export const InstallationRepositoriesPayloadSchema = z.object({
  action: z.string(), // typically "added" | "removed"
  installation: InstallationSchema,
})
export type InstallationRepositoriesPayload = z.infer<
  typeof InstallationRepositoriesPayloadSchema
>

// Repository → discriminated union by action
// We only model the shapes we actually use today. Others are accepted via a
// minimal variant so the route can ignore them without 400s.
export const RepositoryPayloadEditedSchema = z.object({
  action: z.literal("edited"),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema.optional(),
})

// Accept but do not model other repository actions in detail
export const RepositoryPayloadSchema = z.discriminatedUnion("action", [
  RepositoryPayloadEditedSchema,
])

export type RepositoryPayload = z.infer<typeof RepositoryPayloadSchema>

