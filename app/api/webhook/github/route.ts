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

// Hoisted schema map for per-event payload validation
const schemas = {
  issues: IssuesPayloadSchema,
  pull_request: PullRequestPayloadSchema,
  push: PushPayloadSchema,
} as const

function verifySignature({
  signature,
  rawBody,
  secret,
}: {
  signature: string | null
  rawBody: Uint8Array | Buffer
  secret: string
}): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(rawBody)
  let provided: Buffer
  try {
    provided = Buffer.from(signature.slice("sha256=".length), "hex")
  } catch {
    return false
  }
  const expected = Buffer.from(hmac.digest("hex"), "hex")
  if (provided.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(provided, expected)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256")
    const eventHeader = req.headers.get("x-github-event")
    const secret = process.env.GITHUB_WEBHOOK_SECRET

    if (!secret) {
      console.error("[ERROR] GITHUB_WEBHOOK_SECRET not configured")
      return new Response("Webhook secret not configured", { status: 500 })
    }

    if (!eventHeader) {
      console.error("[ERROR] Missing x-github-event header")
      return new Response("Missing event header", { status: 400 })
    }

    // Read raw bytes for signature verification first
    const rawBody = Buffer.from(await req.arrayBuffer())

    if (!verifySignature({ signature, rawBody, secret })) {
      console.error("[ERROR] Invalid webhook signature")
      return new Response("Invalid signature", { status: 401 })
    }

    // Safe to parse after signature verification
    const payload = JSON.parse(rawBody.toString("utf8")) as object

    // Validate and narrow event type
    const eventParse = GithubEventSchema.safeParse(eventHeader)
    if (!eventParse.success) {
      console.error("[ERROR] Unsupported GitHub event:", eventHeader)
      return new Response("Unsupported event", { status: 400 })
    }
    const event = eventParse.data

    // Validate and narrow payload by event
    const r = schemas[event].safeParse(payload)
    if (!r.success) {
      console.error(`[ERROR] Invalid ${event} payload`, r.error.flatten())
      return new Response("Invalid payload", { status: 400 })
    }

    const parsedPayload = r.data
    const installationId = parsedPayload.installation.id

    if (!installationId) {
      console.error("[ERROR] No installation ID found in webhook payload")
      return new Response("No installation ID found", { status: 400 })
    }

    // Route the payload to the appropriate handler (fire-and-forget by design)
    runWithInstallationId(String(installationId), async () => {
      try {
        await routeWebhookHandler({
          event,
          payload: parsedPayload,
        })
      } catch (e) {
        console.error("[ERROR] routeWebhookHandler threw:", e)
      }
    })

    return new Response("Webhook received", { status: 200 })
  } catch (error) {
    console.error("[ERROR] Error handling webhook:", error)
    return new Response("Error", { status: 500 })
  }
}

