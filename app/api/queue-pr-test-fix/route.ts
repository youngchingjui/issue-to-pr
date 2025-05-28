import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { fixTestErrors } from "@/lib/workflows/fixTestErrors"

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, pullNumber } = await request.json()
    const jobId = uuidv4()

    // Fire and forget (do not block on result)
    fixTestErrors({
      repoFullName,
      pullNumber,
      apiKey: process.env.OPENAI_API_KEY!,
      jobId,
    }).catch(console.error)

    return NextResponse.json({ jobId })
  } catch (error) {
    return NextResponse.json({ error: `Failed to start test fix workflow: ${error}` }, { status: 500 })
  }
}
