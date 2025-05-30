import { NextRequest, NextResponse } from "next/server"

import { identifyInconsistencies } from "@/lib/workflows/identifyInconsistencies"

export const dynamic = "force-dynamic"

/**
 * POST /api/workflow/identify-inconsistencies
 *   {
 *      repoFullName: string, // e.g. "owner/repo"
 *      pullNumber: number,
 *      openAIApiKey?: string // (optional, for LLM)
 *   }
 */
export async function POST(request: NextRequest) {
  let json: any
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
    const result = await identifyInconsistencies({
      repoFullName,
      pullNumber,
      openAIApiKey,
    })
    return NextResponse.json({ success: true, result })
  } catch (e) {
    // Log full error for debugging
    console.error("[identify-inconsistencies] Failed to analyze:", e)
    return NextResponse.json(
      { error: "Failed to analyze inconsistencies." },
      { status: 500 }
    )
  }
}
