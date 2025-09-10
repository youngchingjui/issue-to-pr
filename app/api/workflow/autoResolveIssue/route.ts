import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getIssue } from "@/lib/github/issues"
import { getEffectiveOpenAIApiKey } from "@/lib/neo4j/services/openai"
import { AutoResolveIssueRequestSchema } from "@/lib/schemas/api"
import autoResolveIssue from "@/lib/workflows/autoResolveIssue"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueNumber, repoFullName, branch } =
      AutoResolveIssueRequestSchema.parse(body)

    const apiKey = await getEffectiveOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    const jobId = uuidv4()

    ;(async () => {
      try {
        const repo = await getRepoFromString(repoFullName)
        const issueResult = await getIssue({
          fullName: repoFullName,
          issueNumber,
        })

        if (issueResult.type !== "success") {
          throw new Error(JSON.stringify(issueResult))
        }

        await autoResolveIssue({
          issue: issueResult.issue,
          repository: repo,
          apiKey,
          jobId,
          branch,
        })
      } catch (error) {
        console.error(error)
      }
    })()

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

