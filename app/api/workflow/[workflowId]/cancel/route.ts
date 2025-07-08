import { NextRequest, NextResponse } from "next/server"
import { requestCancelWorkflowRun } from "@/lib/neo4j/services/workflow"

export async function POST(
  _: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  await requestCancelWorkflowRun(params.workflowId)
  return NextResponse.json({ success: true })
}
