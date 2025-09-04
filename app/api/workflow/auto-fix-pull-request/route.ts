import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { z } from "zod"

import { getRepoFromString } from "@/lib/github/content"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import autoFixPullRequest from "@/lib/workflows/autoFixPullRequest"

const AutoFixPullRequestRequestSchema = z.object({
  repoFullName: z.string().min(1),
  pullNumber: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repoFullName, pullNumber } = AutoFixPullRequestRequestSchema.parse(
      body
    )

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    const jobId = uuidv4()

    ;(async () => {
      try {
        const repository = await getRepoFromString(repoFullName)
        await autoFixPullRequest({
          repoFullName,
          pullNumber,
          repository,
          apiKey,
          jobId,
        })
      } catch (error) {
        console.error("auto-fix-pull-request workflow error:", error)
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

