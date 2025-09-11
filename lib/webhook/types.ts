// Webhook event types
import type { WebhookEventMap } from "@octokit/webhooks-types"

export enum GitHubEvent {
  Create = "create",
  Delete = "delete",
  Installation = "installation",
  InstallationRepositories = "installation_repositories",
  InstallationTarget = "installation_target",
  Issues = "issues",
  IssueComment = "issue_comment",
  PullRequest = "pull_request",
  PullRequestReview = "pull_request_review",
  PullRequestReviewComment = "pull_request_review_comment",
  PullRequestReviewThread = "pull_request_review_thread",
  Push = "push",
  Repository = "repository",
  Ping = "ping",
}

// Narrow structural payload types for the few fields we access
export type IssuesPayload = {
  action?: string
  label?: { name?: string }
  repository?: { full_name?: string }
  issue?: { number?: number }
  sender?: { login?: string }
}

export type PullRequestPayload = {
  action?: string
  pull_request?: { merged?: boolean; head?: { ref?: string } }
  repository?: { name?: string; owner?: { login?: string } }
}

type Event = keyof WebhookEventMap
type Payload<E extends Event> = WebhookEventMap[E]

export interface WebhookHandler<E extends Event = Event> {
  /** One or more exact event names like "issues.opened", "pull_request.closed" */
  event: E | readonly E[]
  /** Optional additional filter (e.g., by repo or label) */
  canHandle?(payload: Payload<E>): boolean
  handle(payload: Payload<E>): Promise<void>
}

export class WebhookRouter {
  private handlers: { [K in Event]?: WebhookHandler<K>[] } = {}

  on<E extends Event>(event: E, handler: WebhookHandler<E>) {
    ;(this.handlers[event] ??= [] as WebhookHandler<E>[]).push(
      handler as WebhookHandler<E>
    )
  }

  async route<E extends Event>(event: E, payload: Payload<E>) {
    const list = (this.handlers[event] ?? []) as WebhookHandler<E>[]
    for (const h of list) {
      if (!h.canHandle(payload) || h.canHandle(payload)) {
        await h.handle(payload)
      }
    }
  }
}
