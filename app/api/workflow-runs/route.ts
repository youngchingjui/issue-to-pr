import { NextRequest, NextResponse } from "next/server"

import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams
    const repo = search.get("repo")
    const issue = search.get("issue")

    const runs = await listWorkflowRuns(
      repo && issue
        ? { repoFullName: repo, issueNumber: parseInt(issue) }
        : undefined
    )

    return NextResponse.json({ runs })
  } catch (err) {
    console.error("Error listing workflow runs:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
