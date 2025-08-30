import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { resolveMergeConflicts } from "@/lib/workflows/resolveMergeConflicts"

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, pullNumber } = (await request.json()) as {
      repoFullName: string
      pullNumber: number
    }

    if (!repoFullName || !pullNumber) {
      return NextResponse.json(
        { error: "Missing repoFullName or pullNumber" },
        { status: 400 }
      )
    }

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    const jobId = uuidv4()

    // Run in background
    ;(async () => {
      try {
        await resolveMergeConflicts({ repoFullName, pullNumber, apiKey, jobId })
      } catch (err) {
        console.error("resolve-merge-conflicts workflow error:", err)
      }
    })()

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Failed to start resolve-merge-conflicts:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

