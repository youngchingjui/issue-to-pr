import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { ResolveRequestSchema } from "@/lib/schemas/api"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName, apiKey, createPR } =
      ResolveRequestSchema.parse(body)

    // Generate a unique job ID
    const jobId = uuidv4()

    // Start the resolve workflow as a background job
    ;(async () => {
      const persistenceService = new WorkflowPersistenceService()

      try {
        // Get full repository details and issue
        const fullRepo = await getRepoFromString(repoFullName)
        const issue = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        // Initialize workflow with metadata first
        await persistenceService.initializeWorkflow(
          jobId,
          {
            workflowType: "resolve_issue",
            postToGithub: body.postToGithub ?? false,
          },
          {
            number: issueNumber,
            repoFullName,
          }
        )

        await resolveIssue({
          issue,
          repository: fullRepo,
          apiKey,
          jobId,
          createPR,
        })
      } catch (error) {
        // Save error status
        await persistenceService.saveEvent({
          type: "error",
          workflowId: jobId,
          data: {
            error: error instanceof Error ? error.message : String(error),
            recoverable: false,
          },
          timestamp: new Date(),
        })
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
