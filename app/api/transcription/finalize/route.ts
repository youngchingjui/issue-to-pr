import { NextRequest, NextResponse } from "next/server"
import { createClient } from "redis"

import { publishEvent } from "@/lib/services/redis-stream"

export const dynamic = "force-dynamic"

const rKey = (sessionId: string, suffix: string) => `transcribe:${sessionId}:${suffix}`

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sessionId = url.searchParams.get("sessionId") || req.headers.get("x-session-id") || undefined

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    const redis = createClient({ url: process.env.REDIS_URL })
    await redis.connect()

    try {
      const [finalText, provisional] = await Promise.all([
        redis.get(rKey(sessionId, "final")),
        redis.get(rKey(sessionId, "provisional")),
      ])

      const newFinal = [finalText || "", provisional || ""].filter(Boolean).join(" ").trim()

      await Promise.all([
        redis.set(rKey(sessionId, "final"), newFinal),
        redis.set(rKey(sessionId, "provisional"), ""),
      ])

      await publishEvent(sessionId, {
        type: "status",
        data: { status: "transcription_update", final: newFinal, provisional: "" },
        timestamp: new Date(),
      })

      await publishEvent(sessionId, {
        type: "status",
        data: { status: "completed" },
        timestamp: new Date(),
      })

      return NextResponse.json({ ok: true, finalized: true })
    } finally {
      await redis.disconnect()
    }
  } catch (err) {
    console.error("[transcription/finalize] Error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

