import { NextRequest, NextResponse } from "next/server"

import { AlignmentCheckRequestSchema } from "@/lib/types/api/schemas"
import { alignmentCheck } from "@/lib/workflows"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parseResult = AlignmentCheckRequestSchema.safeParse(json)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parseResult.error.errors },
        { status: 400 }
      )
    }
    const { repoFullName, pullNumber, openAIApiKey } = parseResult.data

    const result = await alignmentCheck({
      repoFullName,
      pullNumber,
      openAIApiKey: openAIApiKey,
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
