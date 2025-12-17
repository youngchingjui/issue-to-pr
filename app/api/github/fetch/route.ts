import { NextResponse } from "next/server"
import { z } from "zod"

import { getIssue } from "@/lib/github/issues"
import { getPullRequest } from "@/lib/github/pullRequests"
import { FetchGitHubItemRequestSchema } from "@/lib/schemas/api"
import { GitHubItem } from "@/lib/types/github"

// TODO: Not sure if this is the right implementation.
// i.e. why is this a POST request?
// Also, to fetch either an issue or pull request, we should ideally convert it to a data fetch within an RSC.
// We only need a GET API route if we're fetching from a client component.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, number, fullName } = FetchGitHubItemRequestSchema.parse(body)

    if (type === "issue") {
      const result = await getIssue({ fullName, issueNumber: number })
      if (result.type === "success") {
        const item: GitHubItem = { ...result.issue, itemType: "issue" }
        return NextResponse.json(item)
      }

      if (result.type === "not_found") {
        return NextResponse.json({ error: "Issue not found" }, { status: 404 })
      }
      if (result.type === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      return NextResponse.json({ error: "Failed to fetch issue" }, { status: 500 })
    } else {
      const pr = await getPullRequest({
        repoFullName: fullName,
        pullNumber: number,
      })
      const item: GitHubItem = { ...pr, itemType: "pull" }
      return NextResponse.json(item)
    }
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
