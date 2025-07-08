import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import {
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"
import { initializeWorkflowRun } from "@/lib/neo4j/services/workflow"

/**
 * POST /api/workflow/demo launches a new demo workflow and simulates events.
 */
export async function POST(req: NextRequest) {
  // Give run a unique demo id
  const id = `demo-swr-${uuidv4()}`
  const type = "commentOnIssue" as const

  // Create the run
  const { run } = await initializeWorkflowRun({ id, type })

  // Stage initial event ("running")
  await createWorkflowStateEvent({ workflowId: id, state: "running" })

  // Schedule additional demo events at intervals (simulate streaming/event arrival)
  // Use setTimeouts, but don't block API resolution (fire-and-forget)
  const demoEvents = [
    { delay: 1000, content: "First event: Setup initialized." },
    { delay: 2200, content: "Second event: Checking prerequisites." },
    { delay: 3200, content: "Third event: Running logic." },
    { delay: 4200, content: "Fourth event: Completed run." },
  ]
  for (const [i, ev] of demoEvents.entries()) {
    setTimeout(async () => {
      await createStatusEvent({
        workflowId: id,
        content: `[Demo] ${ev.content}`,
      })
      // Mark completion state on last event
      if (i === demoEvents.length - 1) {
        await createWorkflowStateEvent({
          workflowId: id,
          state: "completed",
        })
      }
    }, ev.delay)
  }

  return NextResponse.json({ run })
}
