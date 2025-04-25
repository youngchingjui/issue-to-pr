import { NextResponse } from "next/server"

import { n4j } from "@/lib/neo4j/service"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test API is only available in development mode" },
      { status: 403 }
    )
  }

  try {
    // Create a test workflow ID
    const workflowId = "5de78c6d-8397-4cde-be38-c570e1ab8b97"

    // Create first event
    const event1 = await n4j.createWorkflowStateEvent({
      workflowId,
      state: "running",
      details: "Starting workflow test",
    })

    // Create second event linked to first
    const event2 = await n4j.createWorkflowStateEvent({
      workflowId,
      state: "running",
      details: "Processing task 1",
      parentId: event1.id,
    })

    // Create third event linked to second
    const event3 = await n4j.createWorkflowStateEvent({
      workflowId,
      state: "completed",
      details: "Workflow test completed",
      parentId: event2.id,
    })

    const result = {
      message: "Workflow state events created",
      timestamp: new Date().toISOString(),
      workflowId,
      events: [event1, event2, event3],
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Test API error:", error)
    return NextResponse.json(
      {
        error: "Test API failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
