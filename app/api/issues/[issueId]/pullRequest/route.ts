import { NextRequest, NextResponse } from "next/server"

import { getLinkedPRNumberForIssue } from "@/lib/github/issues"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const search = request.nextUrl.searchParams
    const repo = search.get("repo")
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

    const prNumber = await getLinkedPRNumberForIssue({
      repoFullName: repo,
      issueNumber,
    })
    return NextResponse.json({ prNumber })
  } catch (err) {
    console.error("Error fetching PR for issue:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
