import { NextRequest, NextResponse } from "next/server"

import { getJobStatus, initializeRedis } from "@/lib/redis"
import { jobStatusEmitter } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")
  await initializeRedis()

  if (!jobId) {
    return NextResponse.json(
      { error: `Did not receive jobId in request. Received: ${jobId}` },
      { status: 404 }
    )
  }

  try {
    const status = await getJobStatus(jobId)

    if (!status) {
      return NextResponse.json(
        { error: `Job ID ${jobId} not found in cache.` },
        { status: 404 }
      )
    }

    return new NextResponse(
      new ReadableStream({
        start(controller) {
          const onStatusUpdate = (updatedJobId: string, status: string) => {
            if (updatedJobId === jobId) {
              controller.enqueue(`data: ${status}\n\n`)

              if (
                status.startsWith("Completed") ||
                status.startsWith("Failed")
              ) {
                jobStatusEmitter.removeListener("statusUpdate", onStatusUpdate)
                // Send a final message indicating the stream is finished
                controller.enqueue(`data: Stream finished\n\n`)
                controller.close()
              }
            }
          }

          jobStatusEmitter.on("statusUpdate", onStatusUpdate)

          // Send the initial status
          controller.enqueue(`data: ${status}\n\n`)
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
