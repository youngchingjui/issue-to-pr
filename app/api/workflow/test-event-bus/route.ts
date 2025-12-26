import { NextRequest, NextResponse } from "next/server"

import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"
import { BaseStreamEvent } from "@/lib/types/events"
import { publishEvent } from "@/lib/services/redis-stream"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json()

    // Determine initiator from session
    const session = await auth()
    const initiatorGithubLogin = session?.profile?.login ?? null

    // Initialize the workflow run record first so the UI can navigate immediately
    await initializeWorkflowRun({ id: workflowId, type: "testEventBus", initiatorGithubLogin })

    // Publish a test event
    const event: BaseStreamEvent = {
      type: "status",
      content: "Test event published",
    }
    await publishEvent(workflowId, event)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[test-event-bus] Failed:", error)
    return NextResponse.json(
      { error: "Failed to publish test event." },
      { status: 500 }
    )
  }
}

