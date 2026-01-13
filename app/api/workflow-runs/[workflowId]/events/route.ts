import { NextRequest, NextResponse } from "next/server"

import { getWorkflowRunEvents } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const events = await getWorkflowRunEvents(params.workflowId)
    return NextResponse.json({ events })
  } catch (err) {
    console.error("Error fetching workflow events:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
