import { NextRequest, NextResponse } from "next/server"

import WorkflowEventEmitter, {
  WorkflowEvent,
} from "@/lib/services/EventEmitter"

// Mark this route as dynamic
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const stream = new ReadableStream({
      start(controller) {
        const onEvent = (event: WorkflowEvent) => {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
        }

        WorkflowEventEmitter.subscribe(params.workflowId, onEvent)

        // Cleanup on client disconnect
        request.signal.addEventListener("abort", () => {
          WorkflowEventEmitter.unsubscribe(params.workflowId, onEvent)
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("Error in workflow SSE handler:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  return NextResponse.json({ status: "cleaned up" })
}
