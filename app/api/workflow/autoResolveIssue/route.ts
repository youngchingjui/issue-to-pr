import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getInstallationTokenFromRepo } from "@/lib/github/installation"
import { getIssue } from "@/lib/github/issues"
import { getInstallationFromRepo } from "@/lib/github/repos"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { AutoResolveIssueRequestSchema } from "@/lib/schemas/api"
import { addJob } from "@shared/services/job"
import { AutoResolveIssueJobDataSchema } from "@shared/services/workflows/autoResolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName } =
      AutoResolveIssueRequestSchema.parse(body)

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    // Ensure GitHub App is installed on the target repository
    const [owner, repo] = repoFullName.split("/")
    try {
      await getInstallationFromRepo({ owner, repo })
    } catch (err) {
      return NextResponse.json(
        {
          error:
            "The Issue-to-PR GitHub App is not installed on the target repository. Please install it and try again.",
        },
        { status: 403 }
      )
    }

    // Resolve repository and issue details up front (orchestrator role)
    const [repository, issueResult, installationToken] = await Promise.all([
      getRepoFromString(repoFullName),
      getIssue({ fullName: repoFullName, issueNumber }),
      getInstallationTokenFromRepo({ owner, repo }),
    ])

    if (issueResult.type !== "success") {
      const status =
        issueResult.type === "not_found"
          ? 404
          : issueResult.type === "forbidden"
            ? 403
            : 500
      return NextResponse.json(
        { error: `Failed to fetch issue: ${issueResult.type}` },
        { status }
      )
    }

    const jobId = uuidv4()

    const payload = AutoResolveIssueJobDataSchema.parse({
      jobId,
      repoFullName,
      issueNumber,
      openaiApiKey: apiKey,
      installationToken,
      repository,
      issue: issueResult.issue,
    })

    await addJob("workflows", "autoResolveIssue", payload, {
      jobId,
      removeOnComplete: 100,
      removeOnFail: 100,
    })

    return NextResponse.json({ jobId }, { status: 202 })
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

