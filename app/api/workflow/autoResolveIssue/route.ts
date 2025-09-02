import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { AutoResolveIssueRequestSchema } from "@/lib/schemas/api"
import { getInstallationFromRepo } from "@/lib/github/repos"
import { addJob } from "@/shared/src/services/job"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName } =
      AutoResolveIssueRequestSchema.parse(body)

    // Determine installation id for the repo so the worker can use the App token
    const [owner, repo] = repoFullName.split("/")
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Invalid repository full name" },
        { status: 400 }
      )
    }

    let installationId: number | undefined
    try {
      const installation = await getInstallationFromRepo({ owner, repo })
      installationId = installation.data.id
    } catch (e) {
      console.error(
        `[autoResolveIssue] Failed to get installation for ${repoFullName}:`,
        e
      )
      return NextResponse.json(
        { error: "GitHub App is not installed on this repository" },
        { status: 403 }
      )
    }

    // Enqueue job for the worker to process
    const jobId = await addJob("default", "autoResolveIssue", {
      repoFullName,
      issueNumber,
      installationId,
    })

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Error processing request:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}

