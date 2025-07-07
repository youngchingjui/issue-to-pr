import { NextRequest, NextResponse } from "next/server"

import { getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"

// GET /api/workflow/:workflowId/events - returns event list for polling
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const events = await getWorkflowRunWithDetails(params.workflowId)
    return NextResponse.json(events)
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to get events: ${err}` },
      { status: 500 }
    )
  }
}
