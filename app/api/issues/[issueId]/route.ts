import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { closeIssue } from "@/lib/github/issues"

const CloseIssueSchema = z.object({
  repoFullName: z.string().min(1),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const body = await req.json()
    const { repoFullName } = CloseIssueSchema.parse(body)
    const issueNumber = parseInt(params.issueId)

    if (!Number.isFinite(issueNumber)) {
      return NextResponse.json({ error: "Invalid issue id" }, { status: 400 })
    }

    await closeIssue({ repoFullName, issueNumber })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      )
    }
    console.error("Error closing issue:", error)
    return NextResponse.json(
      { error: "Failed to close issue" },
      { status: 500 }
    )
  }
}

