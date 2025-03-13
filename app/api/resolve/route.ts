import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { updateJobStatus } from "@/lib/redis-old"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName, apiKey } =
      ResolveRequestSchema.parse(body)

    // Generate a unique job ID
    const jobId = uuidv4()
    await updateJobStatus(jobId, "Starting resolve workflow")

    // Start the resolve workflow as a background job
    ;(async () => {
      try {
        // Get full repository details and issue
        const fullRepo = await getRepoFromString(repoFullName)
        const issue = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })
        const response = await resolveIssue(issue, fullRepo, apiKey)
        await updateJobStatus(jobId, "Completed: " + JSON.stringify(response))
      } catch (error) {
        await updateJobStatus(jobId, "Failed: " + error.message)
      }
    })()

    // Immediately return the job ID to the client
    return NextResponse.json({ jobId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
