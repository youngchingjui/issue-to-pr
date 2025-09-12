import crypto from "crypto"
import { NextRequest } from "next/server"

import { routeWebhookHandler } from "@/lib/webhook/router"
import {
  GithubEventSchema,
  IssuesPayloadSchema,
  PullRequestPayloadSchema,
  PushPayloadSchema,
} from "@/lib/webhook/types"
import { runWithInstallationId } from "@/lib/utils/utils-server"

async function verifySignature(
  signature: string,
  payload: object,
  secret: string
) {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(JSON.stringify(payload))

  const digest = `sha256=${hmac.digest("hex")}`
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256") as string
    const eventHeader = req.headers.get("x-github-event") as string
    const payload = (await req.json()) as object
    const secret = process.env.GITHUB_WEBHOOK_SECRET

    if (!secret) {
      console.error("[ERROR] GITHUB_WEBHOOK_SECRET not configured")
      return new Response("Webhook secret not configured", { status: 500 })
    }

    if (!verifySignature(signature, payload, secret)) {
      console.error("[ERROR] Invalid webhook signature")
      return new Response("Invalid signature", { status: 401 })
    }

    // Validate and narrow event type
    const eventParse = GithubEventSchema.safeParse(eventHeader)
    if (!eventParse.success) {
      console.error("[ERROR] Unsupported GitHub event:", eventHeader)
      return new Response("Unsupported event", { status: 400 })
    }
    const event = eventParse.data

    // Validate and narrow payload by event
    let installationId: number | undefined
    let parsedPayload: object
    if (event === "issues") {
      const r = IssuesPayloadSchema.safeParse(payload)
      if (!r.success) {
        console.error("[ERROR] Invalid issues payload", r.error.flatten())
        return new Response("Invalid payload", { status: 400 })
      }
      parsedPayload = r.data
      installationId = r.data.installation?.id
    } else if (event === "pull_request") {
      const r = PullRequestPayloadSchema.safeParse(payload)
      if (!r.success) {
        console.error("[ERROR] Invalid pull_request payload", r.error.flatten())
        return new Response("Invalid payload", { status: 400 })
      }
      parsedPayload = r.data
      installationId = r.data.installation?.id
    } else {
      const r = PushPayloadSchema.safeParse(payload)
      if (!r.success) {
        console.error("[ERROR] Invalid push payload", r.error.flatten())
        return new Response("Invalid payload", { status: 400 })
      }
      parsedPayload = r.data
      installationId = r.data.installation?.id
    }

    if (!installationId) {
      console.error("[ERROR] No installation ID found in webhook payload")
      return new Response("No installation ID found", { status: 400 })
    }

    // Route the payload to the appropriate handler
    runWithInstallationId(String(installationId), async () => {
      await routeWebhookHandler({
        event,
        payload: parsedPayload,
      })
    })

    return new Response("Webhook received", { status: 200 })
  } catch (error) {
    console.error("[ERROR] Error handling webhook:", error)
    return new Response("Error", { status: 500 })
  }
}

