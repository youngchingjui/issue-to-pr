import { type Redis as RedisClient } from "ioredis"
import { NextRequest, NextResponse } from "next/server"
import { createEphemeralSubscriber } from "shared/adapters/ioredis/client"
import { JOB_STATUS_CHANNEL } from "shared/entities/Channels"
import { JobStatusUpdateSchema } from "shared/entities/events/JobStatus"

import { SSEUtils } from "@/lib/utils/utils-common"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json(
      { error: `Did not receive jobId in request. Received: ${jobId}` },
      { status: 404 }
    )
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return NextResponse.json({ error: "REDIS_URL is not set" }, { status: 500 })
  }

  try {
    let sub: RedisClient | undefined

    return new NextResponse(
      new ReadableStream({
        start(controller) {
          sub = createEphemeralSubscriber(redisUrl)

          // Subscribe and handle messages
          sub.subscribe(JOB_STATUS_CHANNEL).catch((err) => {
            console.error("Failed to subscribe:", err)
            controller.error(err)
          })

          sub.on("connecting", () => {})

          sub.on("connect", () => {})

          sub.on("ready", () => {})

          sub.on("message", (channel, message) => {
            switch (channel) {
              case JOB_STATUS_CHANNEL:
                const parsed = JobStatusUpdateSchema.safeParse(
                  JSON.parse(message)
                )
                if (!parsed.success) {
                  // Optionally log parsed.error for diagnostics
                  console.error(
                    "Failed to parse job status update:",
                    parsed.error
                  )
                  return
                }

                const { jobId: updatedJobId, status } = parsed.data
                if (updatedJobId !== jobId) return

                const safeStatus = SSEUtils.encodeStatus(String(status))
                controller.enqueue(`data: ${safeStatus}\n\n`)

                if (
                  String(status).startsWith("Completed") ||
                  String(status).startsWith("Failed")
                ) {
                  // Best-effort cleanup; no awaits inside stream callbacks
                  if (sub) {
                    sub.unsubscribe(JOB_STATUS_CHANNEL).catch(() => {})
                    sub.quit().catch(() => {})
                  }
                  controller.enqueue(`data: Stream finished\n\n`)
                  controller.close()
                }
              default:
                return
            }
          })

          sub.on("error", (err) => {
            console.error("Redis subscriber error:", err)
          })

          sub.on("end", () => {})
        },

        cancel() {
          // Clean up subscriber and base client
          if (sub && sub.status !== "end") {
            sub.unsubscribe(JOB_STATUS_CHANNEL).catch(() => {})
            sub.quit().catch(() => {})
          }
          if (sub && sub.status !== "end") {
            sub.quit().catch(() => {})
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    )
  } catch (err) {
    console.error("Error accessing Redis:", err)
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    )
  }
}
