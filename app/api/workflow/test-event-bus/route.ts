import { NextResponse } from "next/server"
import { testEventInfrastructure } from "shared/usecases/workflows/testEventInfrastructure"
import { v4 as uuidv4 } from "uuid"

import PersistingEventBusAdapter from "@/lib/adapters/PersistingEventBusAdapter"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function POST() {
  const workflowId = uuidv4()

  try {
    // Initialize the workflow run record first so the UI can navigate immediately
    await initializeWorkflowRun({ id: workflowId, type: "testEventBus" })

    const redisUrl = process.env.REDIS_URL
    const eventBus = new PersistingEventBusAdapter(redisUrl)

    // Fire the test workflow; it will emit events via the event bus
    await testEventInfrastructure({ eventBus }, { workflowId })

    return NextResponse.json({ workflowId })
  } catch (err) {
    console.error("Error starting test event workflow:", err)
    return NextResponse.json(
      { error: "Failed to start workflow" },
      { status: 500 }
    )
  }
}
