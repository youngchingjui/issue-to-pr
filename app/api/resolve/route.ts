import { NextRequest, NextResponse } from "next/server"

import { getIssue } from "@/lib/github/issues"
import { GitHubRepository } from "@/lib/types"
import { resolveIssue } from "@/lib/workflows/resolveIssue"

type RequestBody = {
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

    console.debug(`[DEBUG] Fetching issue #${issueNumber}`)
    const issue = await getIssue({ repo: repo.name, issueNumber })

    // Enter resolve issue workflow
    // This workflow starts with a coordinator agent, that will call other agents to figure out what to do
    // And resolve the issue

    await resolveIssue(issue, repo, apiKey)

    return NextResponse.json(
      { message: "Finished agent workflow." },
      { status: 200 }
    )
  } catch (error) {
    console.error("[ERROR] Fatal error in POST handler:", error)
    return NextResponse.json(
      { error: "Failed to resolve issue." },
      { status: 500 }
    )
  }
}
