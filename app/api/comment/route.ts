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

import { updateJobStatus } from "@/lib/redis"
import { GitHubRepository } from "@/lib/types"
import commentOnIssue from "@/lib/workflows/commentOnIssue"

type RequestBody = {
  issueNumber: number
  repo: GitHubRepository
  apiKey: string
}

export async function POST(request: NextRequest) {
  const { issueNumber, repo, apiKey }: RequestBody = await request.json()

  // Generate a unique job ID
  const jobId = uuidv4()
  await updateJobStatus(jobId, "Starting comment workflow")

  // Start the comment workflow as a background job
  ;(async () => {
    try {
      const response = await commentOnIssue(issueNumber, repo, apiKey, jobId)
      await updateJobStatus(jobId, "Completed: " + JSON.stringify(response))
    } catch (error) {
      await updateJobStatus(jobId, "Failed: " + error.message)
    }
  })()

  // Immediately return the job ID to the client
  return NextResponse.json({ jobId })
}
