import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { createIssueComment } from "@/lib/github/issues"
import { reviewPullRequest } from "@/lib/workflows/reviewPullRequest"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"

// Type definition for the request body
// Contains information about the pull request to review.
type RequestBody = {
  pullNumber: number
  repoFullName: string
}

export async function POST(request: NextRequest) {
  const { pullNumber, repoFullName }: RequestBody = await request.json()
  const apiKey = await getUserOpenAIApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 401 })
  }

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
      const lastMessage = response.messages[response.messages.length - 1]
      if (typeof lastMessage.content !== "string") {
        throw new Error(
          `Last message content is not a string. Here's the content: ${JSON.stringify(
            lastMessage.content
          )}`
        )
      }
      await createIssueComment({
        issueNumber: pullNumber,
        repoFullName,
        comment: lastMessage.content,
      })
    } catch (error) {
      console.error("Error posting comment:", error)
    }
  })()

  // Immediately return the job ID to the client
  return NextResponse.json({ jobId })
}
