import { NextRequest, NextResponse } from "next/server"
import { createClient } from "redis"

import { transcribeAudio } from "@/lib/openai"
import { publishEvent } from "@/lib/services/redis-stream"

// This route accepts small audio chunks (3-5s) and appends them to a per-session buffer.
// It also performs a naive incremental transcription for live updates and publishes them via SSE
// using the existing /api/workflow/[workflowId] endpoint.

export const dynamic = "force-dynamic"

const rKey = (sessionId: string, suffix: string) =>
  `transcribe:${sessionId}:${suffix}`

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sessionId =
      url.searchParams.get("sessionId") ||
      req.headers.get("x-session-id") ||
      undefined
    const seqParam =
      url.searchParams.get("seq") || req.headers.get("x-seq") || undefined
    const finalizeFlag =
      url.searchParams.get("finalize") ||
      req.headers.get("x-finalize") ||
      undefined

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    const contentType = req.headers.get("content-type") || "audio/webm"

    // If this is a finalize-only call (no body expected), handle finalization and return
    if (finalizeFlag) {
      const redis = createClient({ url: process.env.REDIS_URL })
      await redis.connect()
      try {
        const [finalText, provisional] = await Promise.all([
          redis.get(rKey(sessionId, "final")),
          redis.get(rKey(sessionId, "provisional")),
        ])
        const newFinal = [finalText || "", provisional || ""]
          .filter(Boolean)
          .join(" ")
          .trim()
        await Promise.all([
          redis.set(rKey(sessionId, "final"), newFinal),
          redis.set(rKey(sessionId, "provisional"), ""),
        ])

        await publishEvent(sessionId, {
          type: "status",
          data: {
            status: "transcription_update",
            final: newFinal,
            provisional: "",
          },
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
    }

    // Read the binary body (the audio slice)
    const arrayBuffer = await req.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 })
    }

    const seq = Number(seqParam ?? "0")
    const buf = Buffer.from(arrayBuffer)

    const redis = createClient({ url: process.env.REDIS_URL })
    await redis.connect()

    try {
      // Persist chunk reference structures
      // Store the chunk bytes at a dedicated key and track sequence in a sorted set
      const chunkKey = rKey(sessionId, `chunk:${seq}`)
      await Promise.all([
        redis.set(chunkKey, buf.toString("base64")),
        redis.zAdd(rKey(sessionId, "chunks"), [
          { score: seq, value: String(seq) },
        ]),
        redis.setNX(rKey(sessionId, "mime"), contentType),
      ])

      // Naive live-transcription strategy:
      // - Move previous provisional into final
      // - Transcribe ONLY the newest chunk as provisional
      const [prevFinal, prevProvisional] = await Promise.all([
        redis.get(rKey(sessionId, "final")),
        redis.get(rKey(sessionId, "provisional")),
      ])

      const baseFinal = [prevFinal || "", prevProvisional || ""]
        .filter(Boolean)
        .join(" ")

      // Build a File from the buffer so we can reuse transcribeAudio()
      // Note: Next.js (Node 18+) supports File/Blob in the server runtime.
      const file = new File([buf], `chunk-${seq}.webm`, { type: contentType })

      const tr = await transcribeAudio(file)
      const chunkText = tr.success ? tr.text : ""

      const newFinal = baseFinal.trim()
      const newProvisional = chunkText.trim()

      await Promise.all([
        redis.set(rKey(sessionId, "final"), newFinal),
        redis.set(rKey(sessionId, "provisional"), newProvisional),
        redis.set(rKey(sessionId, "lastSeq"), String(seq)),
      ])

      // Publish SSE update via existing workflow streaming channel
      await publishEvent(sessionId, {
        type: "status",
        data: {
          status: "transcription_update",
          final: newFinal,
          provisional: newProvisional,
          seq,
        },
        timestamp: new Date(),
      })

      return NextResponse.json({ ok: true })
    } finally {
      await redis.disconnect()
    }
  } catch (err) {
    console.error("[transcription/ingest] Error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
