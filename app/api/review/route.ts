import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { updateJobStatus } from "@/lib/redis"
import { reviewPullRequest } from "@/lib/workflows/reviewPullRequest"
import { createPullRequestComment } from "@/lib/github"  // Import the necessary function

// Define the type for the request body
// This type includes the pull request number (pullNumber),
// the full repository name (repoFullName),
// and the API key (apiKey).
type RequestBody = {
  pullNumber: number
  repoFullName: string
  apiKey: string
}

// POST function to handle the incoming requests
// Takes a NextRequest object as an argument
export async function POST(request: NextRequest) {
  const { pullNumber, repoFullName, apiKey }: RequestBody = await request.json()

  // Generate a unique job ID for tracking
  const jobId = uuidv4()
  await updateJobStatus(jobId, "Starting review workflow")

  // Start the review workflow as a background job
  ;(async () => {
    try {
      // Run the review pull request function and store the response
      const response = await reviewPullRequest({
        repoFullName,
        pullNumber,
        apiKey,
      })
      // Update the job status to completed with the response
      await updateJobStatus(jobId, "Completed: " + JSON.stringify(response))

      // Extract the needed comment from the response (assuming response.comment contains it)
      const comment = response.comment || "Review completed successfully."

      // Use createPullRequestComment to post a comment
      try {
        await createPullRequestComment({
          repo: repoFullName,
          pullNumber: pullNumber,
          comment: comment  // Pass the comment to the function
        })
      } catch (commentError) {
        // Log if commenting fails
        console.error(`Failed to post comment: ${commentError.message}`)
      }
    } catch (error) {
      // Update the job status to failed with the error message
      await updateJobStatus(jobId, "Failed: " + error.message)
    }
  })()

  // Immediately return the job ID to the client
  return NextResponse.json({ jobId })
}
