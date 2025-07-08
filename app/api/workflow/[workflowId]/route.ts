import { NextRequest, NextResponse } from "next/server"
import {
  cleanup,
  getEventHistory,
  publishEvent,
  subscribeToEvents,
} from "@/lib/services/redis-stream"
import { BaseStreamEvent } from "@/lib/types/events"
import {
  getWorkflowRunWithDetails,
  deleteWorkflowRunWithEvents,
} from "@/lib/neo4j/services/workflow"

// Mark this route as dynamic
export const dynamic = "force-dynamic"

// SSE streaming endpoint (legacy)
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  // Allow ?plain=1 for regular workflow fetch
  const url = new URL(request.url)
  const plain = url.searchParams.get("plain") === "1"
  if (plain) {
    try {
      const details = await getWorkflowRunWithDetails(params.workflowId)
      if (!details) {
        return NextResponse.json({ error: "Workflow Run not found" }, { status: 404 })
      }
      return NextResponse.json(details)
    } catch (err) {
      console.error("Error fetching workflow details:", err)
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
  }

  const encoder = new TextEncoder()
  try {
    const stream = new TransformStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "connection", data: "established" })}\n\n`
          )
        )
        try {
          const subscriber = await subscribeToEvents(params.workflowId)
          subscriber.on("message", (channel, message) => {
            try {
              const event = JSON.parse(message)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              )
            } catch (err) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", data: "Error processing message" })}\n\n`
                )
              )
            }
          })
          await subscriber.subscribe(`workflow:${params.workflowId}`, () => {})
          const history = await getEventHistory(params.workflowId)
          for (const event of history) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            )
          }
          request.signal.addEventListener("abort", async () => {
            try {
              await subscriber.unsubscribe(`workflow:${params.workflowId}`)
              await subscriber.disconnect()
            } catch (err) {
              console.error("Error during cleanup:", err)
            }
          })
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", data: "Failed to establish Redis connection" })}\n\n`
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  // Only allow certain fields (e.g., postToGithub, state, etc.)
  try {
    const body = await request.json()
    // Only allow 'postToGithub' update for now; add state/etc as DB supports
    const allowed: Record<string, any> = {}
    if (body.postToGithub !== undefined) allowed.postToGithub = !!body.postToGithub
    // TODO: extend for additional PATCH support
    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }
    // Update in DB
    const session = await n4j.getSession()
    let newVal
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (w:WorkflowRun {id: $workflowId}) SET w += $fields RETURN w`,
          { workflowId: params.workflowId, fields: allowed }
        )
      })
      // Fetch and return updated details
      newVal = await getWorkflowRunWithDetails(params.workflowId)
    } finally {
      await session.close()
    }
    return NextResponse.json(newVal)
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  // Cascade delete the workflow run and all events from DB, then clean up Redis
  try {
    await deleteWorkflowRunWithEvents(params.workflowId)
    await cleanup(params.workflowId)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.message === "WorkflowRun not found") {
      return NextResponse.json({ error: "WorkflowRun not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

