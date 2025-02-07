import { NextRequest, NextResponse } from "next/server"
import { createClient } from "redis"

import { SSEUtils } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json(
      { error: `Did not receive jobId in request. Received: ${jobId}` },
      { status: 404 }
    )
  }

  const redis = createClient()
  await redis.connect()

  try {
    let subscriber

    return new NextResponse(
      new ReadableStream({
        start(controller) {
          subscriber = redis.duplicate()
          subscriber.connect()

          subscriber.subscribe("jobStatusUpdate", (message) => {
            const { jobId: updatedJobId, status } = JSON.parse(message)
            if (updatedJobId === jobId) {
              // Replace \n\n with placeholder
              const safeStatus = SSEUtils.encodeStatus(status)
              controller.enqueue(`data: ${safeStatus}\n\n`)

              if (
                status.startsWith("Completed") ||
                status.startsWith("Failed")
              ) {
                subscriber.unsubscribe("jobStatusUpdate")
                controller.enqueue(`data: Stream finished\n\n`)
                controller.close()
              }
            }
          })
        },

        cancel(reason) {
          if (subscriber && subscriber.isOpen) {
            subscriber.unsubscribe("jobStatusUpdate")
            subscriber.quit()
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
