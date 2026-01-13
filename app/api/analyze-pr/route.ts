import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

import { identifyPRGoal } from "@/lib/workflows/identifyPRGoal"

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, pullNumber } = await request.json()

    // Generate a unique job ID
    const jobId = uuidv4()

    // Start the workflow asynchronously
    identifyPRGoal({
      repoFullName,
      pullNumber,
      apiKey: process.env.OPENAI_API_KEY!,
      jobId,
    }).catch(console.error)

    // Return the job ID immediately
    return NextResponse.json({ jobId })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to start analysis: ${error}` },
      { status: 500 }
    )
  }
}
