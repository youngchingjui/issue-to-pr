import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import autoResolveIssue from "@/lib/workflows/autoResolveIssue"

export const AutoResolveIssueRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string().min(1),
})

export const AutoResolveIssueResponseSchema = z.object({
  jobId: z.string(),
})

export const AutoResolveIssueErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
})

export type AutoResolveIssueRequest = z.infer<
  typeof AutoResolveIssueRequestSchema
>
export type AutoResolveIssueResponse = z.infer<
  typeof AutoResolveIssueResponseSchema
>
export type AutoResolveIssueErrorResponse = z.infer<
  typeof AutoResolveIssueErrorResponseSchema
>

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName } =
      AutoResolveIssueRequestSchema.parse(body)

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      const errorResponse: AutoResolveIssueErrorResponse = {
        error: "Missing OpenAI API key",
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    const jobId = uuidv4()

    ;(async () => {
      try {
        const repo = await getRepoFromString(repoFullName)
        const issueResult = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        if (issueResult.type !== "success") {
          throw new Error(JSON.stringify(issueResult))
        }

        await autoResolveIssue({
          issue: issueResult.issue,
          repository: repo,
          apiKey,
          jobId,
        })
      } catch (error) {
        console.error(error)
      }
    })()

    const response: AutoResolveIssueResponse = { jobId }
    return NextResponse.json(response)
  } catch (error) {
    console.error("Error processing request:", error)

    if (error instanceof z.ZodError) {
      const errorResponse: AutoResolveIssueErrorResponse = {
        error: "Invalid request data",
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const errorResponse: AutoResolveIssueErrorResponse = {
      error: "Failed to process request",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
