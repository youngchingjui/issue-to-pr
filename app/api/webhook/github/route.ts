import crypto from "crypto"
import { NextRequest } from "next/server"

import { runWithInstallationId } from "@/lib/utils/utils-server"
import { routeWebhookHandler } from "@/lib/webhook"

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
  // Compare raw digest bytes
  const expected = Buffer.from(hmac.digest("hex"), "hex")
  let provided: Buffer
  try {
    provided = Buffer.from(signature.slice("sha256=".length), "hex")
  } catch {
    return false
  }
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
    const event = req.headers.get("x-github-event")
    const secret = process.env.GITHUB_WEBHOOK_SECRET

    if (!secret) {
      console.error("[ERROR] GITHUB_WEBHOOK_SECRET not configured")
      return new Response("Webhook secret not configured", { status: 500 })
    }

    if (!event) {
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
    const payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>

    const installation = payload?.installation as Record<string, unknown> | undefined
    const installationId = installation?.id as number | string | undefined
    if (!installationId) {
      console.error("[ERROR] No installation ID found in webhook payload")
      return new Response("No installation ID found", { status: 400 })
    }

    // Route the payload to the appropriate handler
    runWithInstallationId(String(installationId), async () => {
      try {
        await routeWebhookHandler({
          event,
          payload,
        })
      } catch (e) {
        console.error("[ERROR] routeWebhookHandler threw:", e)
      }
    })

    // Respond with a success status
    return new Response("Webhook received", { status: 200 })
  } catch (error) {
    console.error("[ERROR] Error handling webhook:", error)
    return new Response("Error", { status: 500 })
  }
}

