// Webhook event types
import type { WebhookEventMap } from "@octokit/webhooks-types"
import { z } from "zod"

export const GithubEventSchema = z.enum(["issues", "pull_request", "push"])

export type GithubEvent = z.infer<typeof GithubEventSchema>

export const IssuesPayloadSchema = z.object({
  action: z.string(),
  label: z.object({ name: z.string() }),
  repository: z.object({ full_name: z.string() }),
  issue: z.object({ number: z.number() }),
  sender: z.object({ login: z.string() }),
})

export type IssuesPayload = z.infer<typeof IssuesPayloadSchema>

export const PullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    merged: z.boolean(),
    head: z.object({ ref: z.string() }),
  }),
  repository: z.object({
    name: z.string(),
    owner: z.object({ login: z.string() }),
  }),
})

export type PullRequestPayload = z.infer<typeof PullRequestPayloadSchema>

export type Event = keyof WebhookEventMap
export type Payload<E extends Event> = WebhookEventMap[E]

export interface WebhookHandler<E extends Event = Event> {
  /** One or more exact event names like "issues.opened", "pull_request.closed" */
  event: E | readonly E[]
  /** Optional additional filter (e.g., by repo or label) */
  canHandle?(payload: Payload<E>): boolean
  handle(payload: Payload<E>): Promise<void>
}

export class WebhookRouter {
  private handlers: Partial<Record<Event, WebhookHandler[]>> = {}

  on<E extends Event>(event: E, handler: WebhookHandler<E>) {
    const list = (this.handlers[event] ??= []) as WebhookHandler[]
    list.push(handler as unknown as WebhookHandler)
  }

  async route<E extends Event>(event: E, payload: Payload<E>) {
    const list = (this.handlers[event] ?? []) as WebhookHandler[]
    let executedHandlers = 0
    for (const h of list as WebhookHandler<E>[]) {
      if (!h.canHandle || h.canHandle(payload)) {
        await h.handle(payload)
        executedHandlers += 1
      }
    }
    return executedHandlers
  }
}

const map: WebhookEventMap
const a: WebhookEventMap["issues"] = {
  action: "opened",
  issue: {
    number: 1,
  },
  repository: {
    full_name: "owner/repo",
  },
  sender: {
    login: "user",
  },
}

console.log(a)
