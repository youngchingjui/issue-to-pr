import crypto from "crypto"
import { NextRequest } from "next/server"

import { runWithInstallationId } from "@/lib/utils/utils-server"
import { routeWebhookHandler } from "@/lib/webhook/router"

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
    const event = req.headers.get("x-github-event") as string
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

    const installationId = payload["installation"]["id"]
    if (!installationId) {
      console.error("[ERROR] No installation ID found in webhook payload")
      return new Response("No installation ID found", { status: 400 })
    }

    // Route the payload to the appropriate handler
    runWithInstallationId(installationId, async () => {
      await routeWebhookHandler({
        event,
        payload,
      })
    })

    // Respond with a success status
    return new Response("Webhook received", { status: 200 })
  } catch (error) {
    console.error("[ERROR] Error handling webhook:", error)
    return new Response("Error", { status: 500 })
  }
}
