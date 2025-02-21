import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { createIssueComment } from "@/lib/github/issues"
import { updateJobStatus } from "@/lib/redis-old"
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
  await updateJobStatus(jobId, "Starting review workflow")

  // Start the review workflow as a background job
  ;(async () => {
    try {
      const response = await reviewPullRequest({
        repoFullName,
        pullNumber,
        apiKey,
      })

      // Post the AI-generated review as a comment on the pull request
      await createIssueComment({
        issueNumber: pullNumber,
        repoFullName,
        comment: response,
      })

      await updateJobStatus(jobId, "Review completed and comment posted")
    } catch (error) {
      console.error("Error posting comment:", error)
      await updateJobStatus(jobId, "Failed: " + error.message)
    }
  })()

  // Immediately return the job ID to the client
  return NextResponse.json({ jobId })
}
