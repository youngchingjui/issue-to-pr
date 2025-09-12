// Webhook event types and routing contracts
import { z } from "zod"

export const GithubEventSchema = z.enum(["issues", "pull_request", "push"])
export type GithubEvent = z.infer<typeof GithubEventSchema>

// Common optional fields present on GitHub App webhooks
const InstallationSchema = z.object({ id: z.number() }).optional()

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

export interface WebhookHandler<P = unknown> {
  canHandle(event: string, payload: P): boolean
  handle(event: string, payload: P): Promise<void>
}

export class WebhookRouter {
  private handlers: WebhookHandler[] = []

  register(handler: WebhookHandler) {
    this.handlers.push(handler)
  }

  async route(event: string, payload: object) {
    let executedHandlers = 0
    for (const h of this.handlers) {
      if (h.canHandle(event, payload as never)) {
        await h.handle(event, payload as never)
        executedHandlers += 1
      }
    }
    return executedHandlers
  }
}

