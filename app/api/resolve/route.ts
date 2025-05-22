import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName, apiKey, createPR, planId } =
      ResolveRequestSchema.parse(body)

    // Generate a unique job ID
    const jobId = uuidv4()

    // Start the resolve workflow as a background job
    ;(async () => {
      try {
        // Get full repository details and issue
        const fullRepo = await getRepoFromString(repoFullName)
        const issue = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        await resolveIssue({
          issue,
          repository: fullRepo,
          apiKey,
          jobId,
          createPR,
          planId, // Pass planId if present
        })
      } catch (error) {
        // Save error status
        console.error(String(error))
      }
    })()

    // Return the job ID immediately
    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Error processing request:", error)
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
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
