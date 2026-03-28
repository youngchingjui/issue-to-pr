import { NextRequest, NextResponse } from "next/server"

import { resolveUserApiKey } from "@/lib/neo4j/services/user"
import { AlignmentCheckRequestSchema } from "@/lib/types/api/schemas"
import { alignmentCheck } from "@/lib/workflows/alignmentCheck"
import { checkProviderSupported } from "@/shared/services/resolveApiKey"

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
    const { repoFullName, pullNumber } = parseResult.data
    const resolved = await resolveUserApiKey()
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 401 })
    }
    const unsupported = checkProviderSupported(resolved.provider)
    if (unsupported) {
      return NextResponse.json({ error: unsupported }, { status: 422 })
    }
    const apiKey = resolved.apiKey

    const result = await alignmentCheck({
      repoFullName,
      pullNumber,
      openAIApiKey: apiKey,
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
