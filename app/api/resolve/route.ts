import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { getIssue } from "@/lib/github/issues"
import { GitHubRepository } from "@/lib/types"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

// TypeScript type for request body
interface RequestBody {
  issueNumber: number
  repo: GitHubRepository
  apiKey: string
}

export async function POST(request: NextRequest) {
  const { issueNumber, repo, apiKey }: RequestBody = await request.json()

  try {
    console.debug("[DEBUG] Starting POST request handler")

    if (typeof issueNumber !== "number") {
      console.debug("[DEBUG] Invalid issue number provided:", issueNumber)
      return NextResponse.json(
        { error: "Invalid issueNumber provided." },
        { status: 400 }
      )
    }

    // Generate a unique job ID
    const jobId = uuidv4()
    console.debug(`[DEBUG] Generated job ID: ${jobId}`)

    // Start the issue resolution in a new asynchronous task
    ;(async () => {
      try {
        console.debug(`[DEBUG] Fetching issue #${issueNumber}`)
        const issue = await getIssue({
          fullName: repo.full_name,
          issueNumber,
        })

        // Enter resolve issue workflow asynchronously
        await resolveIssue(issue, repo, apiKey)

        console.debug(
          `[DEBUG] Workflow for job ID ${jobId} completed successfully`
        )
      } catch (error) {
        console.error(`[ERROR] Workflow failed for job ID ${jobId}:`, error)
      }
    })()

    return NextResponse.json(
      { message: "Workflow started successfully.", jobId },
      { status: 202 }
    )
  } catch (error) {
    console.error("[ERROR] Fatal error in POST handler:", error)
    return NextResponse.json(
      { error: "Failed to initiate workflow." },
      { status: 500 }
    )
  }
}
