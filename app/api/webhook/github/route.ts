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

function verifySignature({
  signature,
  rawBody,
  secret,
}: {
  signature: string | null
  rawBody: string
  secret: string
}): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(rawBody, "utf8")
  const expected = `sha256=${hmac.digest("hex")}`
  try {
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

type WithInstallation = { installation?: { id?: number } }

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256")
    const eventHeader = req.headers.get("x-github-event") as string
    const secret = process.env.GITHUB_WEBHOOK_SECRET

    if (!secret) {
      console.error("[ERROR] GITHUB_WEBHOOK_SECRET not configured")
      return new Response("Webhook secret not configured", { status: 500 })
    }

    // Read raw body for signature verification first
    const rawBody = await req.text()

    if (!verifySignature({ signature, rawBody, secret })) {
      console.error("[ERROR] Invalid webhook signature")
      return new Response("Invalid signature", { status: 401 })
    }

    // Safe to parse after signature verification
    const payload = JSON.parse(rawBody) as object

    // Validate and narrow event type
    const eventParse = GithubEventSchema.safeParse(eventHeader)
    if (!eventParse.success) {
      console.error("[ERROR] Unsupported GitHub event:", eventHeader)
      return new Response("Unsupported event", { status: 400 })
    }
    const event = eventParse.data

    // Validate and narrow payload by event
    const schemas = {
      issues: IssuesPayloadSchema,
      pull_request: PullRequestPayloadSchema,
      push: PushPayloadSchema,
    } as const

    const r = schemas[event].safeParse(payload)
    if (!r.success) {
      console.error(`[ERROR] Invalid ${event} payload`, r.error.flatten())
      return new Response("Invalid payload", { status: 400 })
    }

    const parsedPayload = r.data as unknown as WithInstallation
    const installationId = parsedPayload.installation?.id

    if (!installationId) {
      console.error("[ERROR] No installation ID found in webhook payload")
      return new Response("No installation ID found", { status: 400 })
    }

    // Route the payload to the appropriate handler (fire-and-forget by design)
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

