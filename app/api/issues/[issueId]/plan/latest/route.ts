import { NextRequest, NextResponse } from "next/server"

import { listPlansForIssue } from "@/lib/neo4j/services/plan"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const searchParams = _request.nextUrl.searchParams
    const repo = searchParams.get("repo")
    if (!repo) {
      return NextResponse.json(
        { error: "Missing 'repo' query parameter" },
        { status: 400 }
      )
    }

    const issueNumber = parseInt(params.issueId)
    if (Number.isNaN(issueNumber)) {
      return NextResponse.json({ error: "Invalid issue id" }, { status: 400 })
    }

    const plans = await listPlansForIssue({ repoFullName: repo, issueNumber })
    if (!plans.length) return NextResponse.json({ planId: null })

    plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return NextResponse.json({ planId: plans[0].id })
  } catch (err) {
    console.error("Error fetching latest plan id:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

