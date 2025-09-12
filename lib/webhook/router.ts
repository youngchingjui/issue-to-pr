import { type Event, GitHubEvent, type Payload, WebhookRouter } from "./types"

// Singleton router instance to register concrete handlers elsewhere
export const webhookRouter = new WebhookRouter()

// Overloads to allow both inferred typed usage and plain string/object
export async function routeWebhookHandler<E extends Event>(args: {
  event: E
  payload: Payload<E>
}): Promise<void>
export async function routeWebhookHandler(args: {
  event: string
  payload: object
}): Promise<void>

export async function routeWebhookHandler<E extends Event | string>({
  event,
  payload,
}: {
  event: E
  payload: E extends Event ? Payload<Extract<E, Event>> : object
}): Promise<void> {
  if (!Object.values(GitHubEvent).includes(event as unknown as GitHubEvent)) {
    console.error("Invalid event type:", event)
    return
  }

  const handledCount = await webhookRouter.route(
    event as Extract<E, Event>,
    payload as Payload<Extract<E, Event>>
  )
  if (handledCount === 0) {
    const repository =
      (payload as unknown as { repository?: { full_name?: string } }).repository
        ?.full_name || "<unknown repository>"
    console.log(`${String(event)} event received on ${repository}`)
  }
}
