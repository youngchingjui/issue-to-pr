import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { updateJobStatus } from "@/lib/redis"
import { reviewPullRequest } from "@/lib/workflows/reviewPullRequest"

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
      await updateJobStatus(jobId, "Completed: " + JSON.stringify(response))
    } catch (error) {
      await updateJobStatus(jobId, "Failed: " + error.message)
    }
  })()

  // Immediately return the job ID to the client
  return NextResponse.json({ jobId })
}
