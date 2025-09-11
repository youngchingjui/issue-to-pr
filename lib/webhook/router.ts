import { IssuesHandler } from "./handlers/issuesHandler"
import { PullRequestHandler } from "./handlers/pullRequestHandler"
import { GitHubEvent, WebhookHandler, WebhookRouter } from "./types"

export const routeWebhookHandler = async ({
  event,
  payload,
}: {
  event: string
  payload: object
}) => {
  if (!Object.values(GitHubEvent).includes(event)) {
    console.error("Invalid event type:", event)
    return
  }

  // Find the first handler that can handle this event
  const handler = this.handlers.find((h) => h.canHandle(event, payload))

  if (handler) {
    await handler.handle(event, payload)
  } else {
    // Log unhandled events for debugging
    const repository =
      (payload as { repository?: { full_name?: string } }).repository
        ?.full_name || "<unknown repository>"
    console.log(`${event} event received on ${repository}`)
  }
}
