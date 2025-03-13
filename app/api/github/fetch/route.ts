import { NextResponse } from "next/server"
import { z } from "zod"

import { getIssue } from "@/lib/github/issues"
import { getPullRequest } from "@/lib/github/pullRequests"
import { FetchGitHubItemRequestSchema } from "@/lib/schemas/api"
import { GitHubIssue, PullRequest } from "@/lib/types/github"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, number, fullName } = FetchGitHubItemRequestSchema.parse(body)

    let data: GitHubIssue | PullRequest
    if (type === "issue") {
      data = await getIssue({ fullName, issueNumber: number })
    } else {
      data = await getPullRequest({
        repoFullName: fullName,
        pullNumber: number,
      })
    }

    return NextResponse.json({
      ...data,
      type,
    })
  } catch (err) {
    console.error("Error fetching GitHub data:", err)

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: err.errors,
        },
        { status: 400 }
      )
    }

    // Handle JSON parsing errors
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          details: err.message,
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch data" },
      { status: 500 }
    )
  }
}
