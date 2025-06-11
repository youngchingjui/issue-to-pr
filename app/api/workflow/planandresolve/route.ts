import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import commentOnIssue from "@/lib/workflows/commentOnIssue"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

const PlanAndResolveRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  apiKey: z.string(),
  postToGithub: z.boolean().default(false),
  createPR: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName, apiKey, postToGithub, createPR } =
      PlanAndResolveRequestSchema.parse(body)

    // Generate a unique job ID
    const jobId = uuidv4()

    // Start the plan and resolve workflow as a background job (fire-and-forget)
    ;(async () => {
      try {
        // 1. Get full repository details and issue
        const fullRepo = await getRepoFromString(repoFullName)

        // 2. commentOnIssue: Generate plan and capture planId
        const commentResult = await commentOnIssue(
          issueNumber,
          fullRepo,
          apiKey,
          jobId,
          postToGithub
        )
        if (!commentResult || !commentResult.planId) {
          console.error(
            "PlanAndResolve: No planId returned from commentOnIssue. Aborting resolveIssue."
          )
          return
        }
        // 3. Reload issue data for resolve
        const issue = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })
        // 4. resolveIssue: Use planId just created
        await resolveIssue({
          issue,
          repository: fullRepo,
          apiKey,
          jobId,
          createPR,
          planId: commentResult.planId,
        })
      } catch (error) {
        console.error("PlanAndResolve background workflow error:", error)
      }
    })()

    return NextResponse.json(
      {
        jobId,
        status: "plan and resolve started",
      },
      { status: 202 }
    )
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
