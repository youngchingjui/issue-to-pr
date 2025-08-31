import { NextResponse } from "next/server"

import { sendServerError } from "@/lib/telemetry/server"

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as {
      message: string
      stack?: string
      url?: string
      userAgent?: string
      source?: string
      componentStack?: string
      meta?: Record<string, unknown>
      severity?: "error" | "warning"
    }

    await sendServerError({
      type: "server-error",
      message: data.message || "Client error",
      stack: data.stack,
      url: data.url,
      meta: {
        source: data.source ?? "client",
        userAgent: data.userAgent,
        componentStack: data.componentStack,
        severity: data.severity ?? "error",
        ...(data.meta || {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    await sendServerError({
      type: "server-error",
      message: err instanceof Error ? err.message : "Failed to record error",
      stack: err instanceof Error ? err.stack : undefined,
      meta: { route: "/api/telemetry/error" },
    })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
