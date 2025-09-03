import { NextRequest, NextResponse } from "next/server"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import { ResolveMergeConflictsRequestSchema } from "@/lib/types/api/schemas"
import { resolveMergeConflicts } from "@/lib/workflows/resolveMergeConflicts"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parseResult = ResolveMergeConflictsRequestSchema.safeParse(json)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { repoFullName, pullNumber, jobId } = parseResult.data

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    const result = await resolveMergeConflicts({
      repoFullName,
      pullNumber,
      apiKey,
      jobId,
    })

    return NextResponse.json({ success: true, result })
  } catch (e) {
    console.error("[resolve-merge-conflicts] Failed:", e)
    return NextResponse.json(
      { error: "Failed to start merge-conflict resolution." },
      { status: 500 }
    )
  }
}

