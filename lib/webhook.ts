import { webhookRouter } from "./webhook"

export const routeWebhookHandler = async ({
  event,
  payload,
}: {
  event: string
  payload: object
}) => {
  await webhookRouter.route(event, payload)
}
