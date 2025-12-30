import { NextRequest, NextResponse } from "next/server"

import { getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  ctx: { params: { workflowId: string } }
) {
  try {
    const { workflow, issue } = await getWorkflowRunWithDetails(
      ctx.params.workflowId
    )

    if (!workflow) return NextResponse.json({ run: null })

    // Minimal mapping to API-friendly shape
    const run = {
      id: workflow.id,
      type: workflow.type,
      createdAt: workflow.createdAt.toISOString(),
      postToGithub: workflow.postToGithub,
      state: "completed" as const, // conservative default; callers should prefer events to infer live status
      issue: issue
        ? { repoFullName: issue.repoFullName, number: issue.number }
        : undefined,
      actor: { kind: "system" as const },
      repository: issue ? { fullName: issue.repoFullName } : undefined,
    }

    return NextResponse.json({ run })
  } catch (err) {
    console.error("Error fetching workflow run:", err)
    return NextResponse.json({ run: null }, { status: 200 })
  }
}

