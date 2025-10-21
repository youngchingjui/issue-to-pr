import crypto from "crypto"
import { NextRequest } from "next/server"

// Responsibilities of this API route
// - Validate GitHub webhook signature and event headers
// - Parse and validate payloads by event type
// - Route events to modular handlers in a clear, tree-like series of switch statements
// - Pass along the installation ID and any needed data directly to handlers
// - Handlers are responsible for doing any authenticated GitHub actions or enqueuing jobs
import { handleIssueLabelAutoResolve } from "@/lib/webhook/github/handlers/issue/label.autoResolveIssue.handler"
import { handleIssueLabelResolve } from "@/lib/webhook/github/handlers/issue/label.resolve.handler"
import { handlePullRequestClosedRemoveContainer } from "@/lib/webhook/github/handlers/pullRequest/closed.removeContainer.handler"
import {
  GithubEventSchema,
  IssuesPayloadSchema,
  PullRequestPayloadSchema,
  PushPayloadSchema,
} from "@/lib/webhook/github/types"

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

    // First level: route by event type in a nested switch tree
    switch (event) {
      case "issues": {
        const r = IssuesPayloadSchema.safeParse(payload)
        if (!r.success) {
          console.error("[ERROR] Invalid issues payload", r.error.flatten())
          return new Response("Invalid payload", { status: 400 })
        }
        const parsedPayload = r.data
        const installationId = String(parsedPayload.installation?.id ?? "")
        if (!installationId) {
          console.error("[ERROR] No installation ID found in webhook payload")
          return new Response("No installation ID found", { status: 400 })
        }

        const action = parsedPayload.action
        switch (action) {
          case "labeled": {
            const labelName: string | undefined =
              parsedPayload.label?.name?.trim()
            switch (labelName?.toLowerCase()) {
              case "resolve": {
                await handleIssueLabelResolve({
                  payload: parsedPayload,
                  installationId,
                })
                break
              }
              case "i2pr: resolve issue": {
                await handleIssueLabelAutoResolve({
                  payload: parsedPayload,
                  installationId,
                })
                break
              }
              default:
                // Unhandled label; ignore
                break
            }
            break
          }
          case "opened":
            // No-op for now
            break
          default:
            // Other issue actions ignored
            break
        }
        break
      }

      case "pull_request": {
        const r = PullRequestPayloadSchema.safeParse(payload)
        if (!r.success) {
          console.error(
            "[ERROR] Invalid pull_request payload",
            r.error.flatten()
          )
          return new Response("Invalid payload", { status: 400 })
        }
        const parsedPayload = r.data

        const action = parsedPayload.action
        switch (action) {
          case "closed": {
            if (parsedPayload.pull_request?.merged) {
              await handlePullRequestClosedRemoveContainer({
                payload: parsedPayload,
              })
            }
            break
          }
          default:
            // Ignore other PR actions
            break
        }
        break
      }

      case "push": {
        const r = PushPayloadSchema.safeParse(payload)
        if (!r.success) {
          console.error("[ERROR] Invalid push payload", r.error.flatten())
          return new Response("Invalid payload", { status: 400 })
        }
        // Currently no-op for push
        break
      }

      default:
        // Unsupported event already filtered, but keep for completeness
        break
    }

    return new Response("Webhook received", { status: 200 })
  } catch (error) {
    console.error("[ERROR] Error handling webhook:", error)
    return new Response("Error", { status: 500 })
  }
}
