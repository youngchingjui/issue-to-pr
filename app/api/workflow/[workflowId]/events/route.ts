import { NextRequest, NextResponse } from "next/server"
import { getWorkflowRunWithDetails, getWorkflowRunMessages } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    // Allow ?onlyMessages=1 for messages only
    const url = new URL(request.url)
    if (url.searchParams.get("onlyMessages") === "1") {
      const messages = await getWorkflowRunMessages(params.workflowId)
      return NextResponse.json(messages)
    }
    // By default, include workflow metadata, all events, and issue info
    const details = await getWorkflowRunWithDetails(params.workflowId)
    if (!details) {
      return NextResponse.json({ error: "Workflow run not found" }, { status: 404 })
    }
    return NextResponse.json(details)
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

