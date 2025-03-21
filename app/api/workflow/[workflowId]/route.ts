import { NextRequest, NextResponse } from "next/server"

import {
  cleanup,
  getEventHistory,
  publishEvent,
  subscribeToEvents,
} from "@/lib/services/redis-stream"
import { BaseStreamEvent } from "@/lib/types/events"

// Mark this route as dynamic
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const encoder = new TextEncoder()

  try {
    const stream = new TransformStream({
      async start(controller) {
        // Send an initial connection established event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "connection",
              data: "established",
            })}\n\n`
          )
        )

        try {
          // Set up Redis subscription
          const subscriber = await subscribeToEvents(params.workflowId)

          // Set up message handler
          subscriber.on("message", (channel, message) => {
            try {
              const event = JSON.parse(message)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              )
            } catch (err) {
              console.error("Error handling Redis message:", err)
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    data: "Error processing message",
                  })}\n\n`
                )
              )
            }
          })

          // Subscribe to the workflow channel with an empty listener
          await subscriber.subscribe(`workflow:${params.workflowId}`, () => {})

          // Load and send existing history
          const history = await getEventHistory(params.workflowId)
          for (const event of history) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }

          // Cleanup on client disconnect
          request.signal.addEventListener("abort", async () => {
            try {
              await subscriber.unsubscribe(`workflow:${params.workflowId}`)
              await subscriber.disconnect()
            } catch (err) {
              console.error("Error during cleanup:", err)
            }
          })
        } catch (err) {
          console.error("Error setting up Redis connection:", err)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                data: "Failed to establish Redis connection",
              })}\n\n`
            )
          )
          controller.terminate()
        }
      },
    })

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache, no-transform",
      },
    })
  } catch (err) {
    console.error("Error in workflow SSE handler:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const event: BaseStreamEvent = await request.json()
    await publishEvent(params.workflowId, event)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error publishing workflow event:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    await cleanup(params.workflowId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error cleaning up workflow:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
