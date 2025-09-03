/*
 Next.js instrumentation file to register global server-side error handlers in production.
 Docs: https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry
*/

import { sendServerError } from "@/lib/telemetry/server"

export async function register() {
  if (process.env.NODE_ENV !== "production") return

  // Avoid installing multiple listeners if register() runs more than once
  const globalAny = globalThis as unknown as { __errorTelemetryInstalled?: boolean }
  if (globalAny.__errorTelemetryInstalled) return
  globalAny.__errorTelemetryInstalled = true

  process.on("uncaughtException", (err) => {
    void sendServerError({
      type: "uncaught-exception",
      message: err?.message || "uncaughtException",
      stack: err?.stack,
      meta: { kind: "process.on(uncaughtException)" },
    })
  })

  process.on("unhandledRejection", (reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
        ? reason
        : "unhandledRejection"

    const stack = reason instanceof Error ? reason.stack : undefined

    void sendServerError({
      type: "unhandled-rejection",
      message,
      stack,
      meta: { kind: "process.on(unhandledRejection)" },
    })
  })
}

