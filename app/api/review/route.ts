import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { createIssueComment } from "@/lib/github/issues"
import { reviewPullRequest } from "@/lib/workflows/reviewPullRequest"

// Type definition for the request body
// Contains information about the pull request to review.
type RequestBody = {
  pullNumber: number
  repoFullName: string
  apiKey: string
}

export async function POST(request: NextRequest) {
  const { pullNumber, repoFullName, apiKey }: RequestBody = await request.json()

  // Generate a unique job ID
  const jobId = uuidv4()

  // Start the review workflow as a background job
  ;(async () => {
    try {
      const response = await reviewPullRequest({
        repoFullName,
        pullNumber,
        apiKey,
        jobId,
      })

      // Post the AI-generated review as a comment on the pull request
      await createIssueComment({
        issueNumber: pullNumber,
        repoFullName,
        comment: response,
      })
    } catch (error) {
      console.error("Error posting comment:", error)
    }
  })()

  // Immediately return the job ID to the client
  return NextResponse.json({ jobId })
}
