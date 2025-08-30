import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { resolveMergeConflicts } from "@/lib/workflows/resolveMergeConflicts"

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, pullNumber } = await request.json()

    if (!repoFullName || typeof pullNumber !== "number") {
      return NextResponse.json(
        { error: "repoFullName and pullNumber are required" },
        { status: 400 }
      )
    }

    const jobId = uuidv4()

    // Kick off workflow asynchronously
    resolveMergeConflicts({
      repoFullName,
      pullNumber,
      apiKey: process.env.OPENAI_API_KEY!,
      jobId,
    }).catch(console.error)

    return NextResponse.json({ jobId })
  } catch (error) {
    console.error("Failed to start resolve-merge-conflicts:", error)
    return NextResponse.json(
      { error: `Failed to start resolve-merge-conflicts: ${String(error)}` },
      { status: 500 }
    )
  }
}

