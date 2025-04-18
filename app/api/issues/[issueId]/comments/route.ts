import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createIssueComment } from "@/lib/github/issues"
import { PostPlanRequestSchema } from "@/lib/types/schemas"

export async function POST(
  req: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const body = await req.json()
    const { content, repoFullName } = PostPlanRequestSchema.parse(body)
    const issueNumber = parseInt(params.issueId)

    // Post the plan as a comment
    const comment = await createIssueComment({
      issueNumber,
      repoFullName,
      comment: content,
    })

    return NextResponse.json({
      success: true,
      commentId: comment.id,
      commentUrl: comment.html_url,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      )
    }
    console.error("Error posting plan:", error)
    return NextResponse.json({ error: "Failed to post plan" }, { status: 500 })
  }
}
