import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const start = searchParams.get("start")

  if (start !== "true") {
    return new NextResponse(JSON.stringify({ error: "Flow not started" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  function generateWorkflowStream() {
    const encoder = new TextEncoder()
    const workflow = [
      {
        type: "node",
        id: "agent1",
        data: { label: "Agent 1" },
        position: { x: 100, y: 100 },
      },
      {
        type: "node",
        id: "agent2",
        data: { label: "Agent 2" },
        position: { x: 400, y: 100 },
      },
      {
        type: "node",
        id: "tool1",
        data: { label: "Tool 1" },
        position: { x: 100, y: 200 },
      },
      {
        type: "node",
        id: "tool2",
        data: { label: "Tool 2" },
        position: { x: 400, y: 200 },
      },
      {
        type: "node",
        id: "agent3",
        data: { label: "Agent 3" },
        position: { x: 250, y: 300 },
      },
      { type: "edge", id: "agent1-tool1", source: "agent1", target: "tool1" },
      { type: "edge", id: "agent2-tool2", source: "agent2", target: "tool2" },
      { type: "edge", id: "tool1-agent3", source: "tool1", target: "agent3" },
      { type: "edge", id: "tool2-agent3", source: "tool2", target: "agent3" },
    ]

    return new ReadableStream({
      async start(controller) {
        for (const item of workflow) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(item)}\n\n`)
          )
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
        // Send a final event to signal completion
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "end" })}\n\n`)
        )
        controller.close()
      },
    })
  }

  return new NextResponse(generateWorkflowStream(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
