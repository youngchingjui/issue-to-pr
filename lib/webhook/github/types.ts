// Webhook event types and routing contracts
import { z } from "zod"

export const GithubEventSchema = z.enum(["issues", "pull_request", "push"])
export type GithubEvent = z.infer<typeof GithubEventSchema>

// Common fields present on GitHub App webhooks (required for this app)
const InstallationSchema = z.object({ id: z.number() })

export const IssuesPayloadSchema = z.object({
  action: z.string(),
  label: z.object({ name: z.string() }).optional(),
  repository: z.object({ full_name: z.string() }),
  issue: z.object({ number: z.number() }),
  sender: z.object({ login: z.string() }),
  installation: InstallationSchema,
})
export type IssuesPayload = z.infer<typeof IssuesPayloadSchema>

export const PullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    merged: z.boolean().optional(),
    head: z.object({ ref: z.string() }).optional(),
  }),
  repository: z.object({
    name: z.string(),
    owner: z.object({ login: z.string() }),
  }),
  installation: InstallationSchema,
})
export type PullRequestPayload = z.infer<typeof PullRequestPayloadSchema>

export const PushPayloadSchema = z.object({
  ref: z.string(),
  repository: z.object({ full_name: z.string() }),
  installation: InstallationSchema,
})
export type PushPayload = z.infer<typeof PushPayloadSchema>
