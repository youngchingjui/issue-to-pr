// This route calls a workflow that uses an LLM to understand a Github issue,
// Explore possibilities, understand the codebase,
// Then generates a post as a comment on the issue.
// The comment should include the following sections:
// - Understanding the issue
// - Possible solutions
// - Relevant code
// - Suggested plan

import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import commentOnIssue from "@/lib/workflows/commentOnIssue"

import {
  type CommentErrorResponse,
  CommentRequestSchema,
  type CommentResponse,
} from "./schemas"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName, postToGithub } =
      CommentRequestSchema.parse(body)

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      const errorResponse: CommentErrorResponse = {
        error: "Missing OpenAI API key",
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    // Generate a unique job ID
    const jobId = uuidv4()

    // Start the comment workflow as a background job
    ;(async () => {
      try {
        // Get full repository details
        const fullRepo = await getRepoFromString(repoFullName)
        const response = await commentOnIssue(
          issueNumber,
          fullRepo,
          apiKey,
          jobId,
          postToGithub
        )
        console.log(response)
      } catch (error) {
        console.error(error)
      }
    })()

    // Immediately return the job ID to the client
    const response: CommentResponse = { jobId }
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: CommentErrorResponse = {
        error: "Invalid request data",
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const errorResponse: CommentErrorResponse = {
      error: "Internal server error",
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
