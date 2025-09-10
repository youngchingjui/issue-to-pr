import { NextRequest, NextResponse } from "next/server"

import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import {
  CreateDependentPRRequestSchema,
  CreateDependentPRResponseSchema,
} from "@/lib/types/api/schemas"
import { createDependentPRWorkflow } from "@/lib/workflows/createDependentPR"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parse = CreateDependentPRRequestSchema.safeParse(json)
    if (!parse.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parse.error.errors },
        { status: 400 }
      )
    }

    const { repoFullName, pullNumber, jobId } = parse.data

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 401 }
      )
    }

    const result = await createDependentPRWorkflow({
      repoFullName,
      pullNumber,
      apiKey,
      jobId,
    })

    return NextResponse.json(
      CreateDependentPRResponseSchema.parse({ success: true, result })
    )
  } catch (e) {
    console.error("[create-dependent-pr] Failed:", e)
    return NextResponse.json(
      { error: "Failed to create dependent PR." },
      { status: 500 }
    )
  }
}

