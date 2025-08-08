import { NextResponse } from "next/server"
import { z } from "zod"

import { getIssue } from "@/lib/github/issues"
import { getPullRequest } from "@/lib/github/pullRequests"
import { GetIssueResult, GitHubIssue, PullRequest } from "@/lib/types/github"

export const FetchGitHubItemRequestSchema = z.object({
  type: z.enum(["issue", "pull"]),
  number: z.number(),
  fullName: z.string(),
})

export const FetchGitHubItemResponseSchema = z
  .object({
    type: z.enum(["issue", "pull"]),
    // The actual data structure varies based on type, so we use a union or any for now
    data: z.any().optional(),
  })
  .passthrough() // Allow additional properties from the GitHub API response

export const FetchGitHubItemErrorResponseSchema = z.object({
  error: z.string(),
  details: z.union([z.string(), z.array(z.any())]).optional(),
})

export type FetchGitHubItemRequest = z.infer<
  typeof FetchGitHubItemRequestSchema
>
export type FetchGitHubItemResponse = z.infer<
  typeof FetchGitHubItemResponseSchema
>
export type FetchGitHubItemErrorResponse = z.infer<
  typeof FetchGitHubItemErrorResponseSchema
>

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
