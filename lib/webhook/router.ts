import { WebhookRouter } from "./types"
import { IssuesHandler } from "./handlers/issuesHandler"
import { PullRequestHandler } from "./handlers/pullRequestHandler"

// Singleton router instance and handler registration
export const webhookRouter = new WebhookRouter()
webhookRouter.register(new IssuesHandler())
webhookRouter.register(new PullRequestHandler())

export async function routeWebhookHandler({
  event,
  payload,
}: {
  event: string
  payload: object
}): Promise<void> {
  const handledCount = await webhookRouter.route(event, payload)
  if (handledCount === 0) {
    const repository = (payload as { repository?: { full_name?: string } })
      .repository?.full_name
    console.log(`${event} event received on ${repository ?? "<unknown repository>"}`)
  }
}

