import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { getRepoFromString } from "@/lib/github/content"
import commentOnIssue from "@/lib/workflows/commentOnIssue"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { issueNumber, repoFullName } = await request.json()

    // Generate a unique workflow ID
    const workflowId = uuidv4()

    // Get repository details
    const repo = await getRepoFromString(repoFullName)

    // Start the workflow in the background
    commentOnIssue(
      issueNumber,
      repo,
      process.env.OPENAI_API_KEY!,
      workflowId
    ).catch((error) => {
      console.error("Workflow failed:", error)
    })

    // Return the workflow ID immediately
    return NextResponse.json({ workflowId })
  } catch (error) {
    console.error("Error in workflow test endpoint:", error)
    return NextResponse.json(
      { error: "Failed to start workflow" },
      { status: 500 }
    )
  }
}
