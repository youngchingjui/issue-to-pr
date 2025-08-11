import { NextResponse } from "next/server"
import { z } from "zod"

import { getIssue } from "@/lib/github/issues"
import { getPullRequest } from "@/lib/github/pullRequests"
import { GetIssueResult, GitHubIssue, PullRequest } from "@/lib/types/github"

import {
  FetchGitHubItemErrorResponse,
  FetchGitHubItemRequestSchema,
  FetchGitHubItemResponse,
} from "./schemas"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, number, fullName } = FetchGitHubItemRequestSchema.parse(body)

    let data: GitHubIssue | PullRequest | GetIssueResult
    if (type === "issue") {
      data = await getIssue({ fullName, issueNumber: number })
    } else {
      data = await getPullRequest({
        repoFullName: fullName,
        pullNumber: number,
      })
    }

    const response: FetchGitHubItemResponse = {
      ...data,
      type,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("Error fetching GitHub data:", err)

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      const errorResponse: FetchGitHubItemErrorResponse = {
        error: "Invalid request data",
        details: err.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Handle JSON parsing errors
    if (err instanceof SyntaxError) {
      const errorResponse: FetchGitHubItemErrorResponse = {
        error: "Invalid JSON in request body",
        details: err.message,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Handle other errors
    const errorResponse: FetchGitHubItemErrorResponse = {
      error: err instanceof Error ? err.message : "Failed to fetch data",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
