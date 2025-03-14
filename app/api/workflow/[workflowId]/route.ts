import { NextRequest, NextResponse } from "next/server"

import { WorkflowEmitter, WorkflowStage } from "@/lib/services/WorkflowEmitter"

// Mark this route as dynamic and edge compatible
export const dynamic = "force-dynamic"
export const runtime = "edge"

function compareStages(a: WorkflowStage[], b: WorkflowStage[]): boolean {
  if (a.length !== b.length) return false
  return a.some((stage, index) => {
    const otherStage = b[index]
    return (
      stage.progress !== otherStage.progress ||
      stage.error !== otherStage.error ||
      String(stage.startedAt) !== String(otherStage.startedAt) ||
      String(stage.completedAt) !== String(otherStage.completedAt)
    )
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const workflowId = params.workflowId
    const workflow = await WorkflowEmitter.getWorkflowState(workflowId)

    if (!workflow) {
      console.error("Workflow not found:", workflowId)
      return NextResponse.json(
        { error: `Workflow ${workflowId} not found` },
        { status: 404 }
      )
    }

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial state
        controller.enqueue(`data: ${JSON.stringify(workflow)}\n\n`)
        controller.enqueue(`: ping\n\n`)

        let lastState = workflow
        let isActive = true

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          if (!isActive) return
          controller.enqueue(`: heartbeat\n\n`)
        }, 15000)

        // Set up polling
        const pollInterval = setInterval(async () => {
          if (!isActive) return
          try {
            const currentState =
              await WorkflowEmitter.getWorkflowState(workflowId)
            if (!currentState) {
              console.error("Workflow disappeared:", workflowId)
              controller.enqueue(`data: {"error": "Workflow not found"}\n\n`)
              controller.close()
              clearInterval(pollInterval)
              clearInterval(heartbeatInterval)
              isActive = false
              return
            }

            const hasChanges =
              currentState.currentStageId !== lastState.currentStageId ||
              String(currentState.completedAt) !==
                String(lastState.completedAt) ||
              currentState.error !== lastState.error ||
              compareStages(currentState.stages, lastState.stages)

            if (hasChanges) {
              controller.enqueue(`data: ${JSON.stringify(currentState)}\n\n`)
              lastState = currentState

              if (currentState.completedAt || currentState.error) {
                controller.enqueue(`data: Stream finished\n\n`)
                controller.close()
                clearInterval(pollInterval)
                clearInterval(heartbeatInterval)
                isActive = false
              }
            }
          } catch (error) {
            console.error("Error polling workflow state:", error)
            controller.enqueue(
              `data: {"error": "Failed to get workflow state"}\n\n`
            )
          }
        }, 1000)

        // Clean up when the client disconnects
        request.signal.addEventListener("abort", () => {
          clearInterval(pollInterval)
          clearInterval(heartbeatInterval)
          isActive = false
        })
      },
    })

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    })

    return new Response(stream, { headers })
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
