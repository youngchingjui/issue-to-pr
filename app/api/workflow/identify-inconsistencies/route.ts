import { NextRequest, NextResponse } from "next/server"

import { alignmentCheck } from "@/lib/workflows"

export const dynamic = "force-dynamic"

type RequestBody = {
  repoFullName: string
  pullNumber: number
  openAIApiKey?: string
}

/**
 * POST /api/workflow/identify-inconsistencies
 *   {
 *      repoFullName: string, // e.g. "owner/repo"
 *      pullNumber: number,
 *      openAIApiKey?: string // (optional, for LLM)
 *   }
 */
export async function POST(request: NextRequest) {
  let json: RequestBody
  try {
    json = await request.json()
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const { repoFullName, pullNumber, openAIApiKey } = json
  if (!repoFullName || !pullNumber) {
    return NextResponse.json(
      { error: "Missing repoFullName or pullNumber in request body." },
      { status: 400 }
    )
  }

  try {
    const result = await alignmentCheck({
      repoFullName,
      pullNumber,
      openAIApiKey,
    })
    return NextResponse.json({ success: true, result })
  } catch (e) {
    // Log full error for debugging
    console.error("[alignmentCheck] Failed to analyze:", e)
    return NextResponse.json(
      { error: "Failed to analyze alignment." },
      { status: 500 }
    )
  }
}
