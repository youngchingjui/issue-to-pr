/*
 Server-side error telemetry utility.
 Sends error events to a configurable webhook URL (e.g., Slack, custom collector).
 Falls back to console logging when no webhook is configured.
*/

export type ServerErrorPayload = {
  type: "server-error" | "unhandled-rejection" | "uncaught-exception"
  message: string
  stack?: string
  timestamp?: string
  url?: string
  method?: string
  userId?: string | null
  meta?: Record<string, unknown>
}

const WEBHOOK_URL = process.env.ERROR_WEBHOOK_URL

export async function sendServerError(payload: ServerErrorPayload) {
  const body = {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    environment: process.env.NODE_ENV,
    service: process.env.VERCEL_PROJECT_PRODUCTION_URL || "issue-to-pr",
  }

  if (!WEBHOOK_URL) {
    // eslint-disable-next-line no-console
    console.error("[telemetry]", body)
    return
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[telemetry] Failed to send to webhook:", err)
    // best effort: still log locally
    // eslint-disable-next-line no-console
    console.error("[telemetry]", body)
  }
}

