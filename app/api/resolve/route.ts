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
    // Patch: extend with environment/installCommand if present on body
    const {
      issueNumber,
      repoFullName,
      apiKey,
      createPR,
      environment,
      installCommand,
    } = body

    // Validate
    const baseBody = ResolveRequestSchema.parse(body)

    // Generate a unique job ID
    const jobId = uuidv4()

    // Start the resolve workflow as a background job
    ;(async () => {
      try {
        // Get full repository details and issue
        const fullRepo = await getRepoFromString(baseBody.repoFullName)
        const issue = await getIssue({
          fullName: baseBody.repoFullName,
          issueNumber: baseBody.issueNumber,
        })

        await resolveIssue({
          issue,
          repository: fullRepo,
          apiKey: baseBody.apiKey,
          jobId,
          createPR: baseBody.createPR,
          ...(environment && { environment }),
          ...(installCommand && { installCommand }),
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
