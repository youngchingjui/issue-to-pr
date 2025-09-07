import { NextRequest, NextResponse } from "next/server"

import {
  IssueTitleRequestSchema,
  IssueTitleResponseSchema,
} from "@/lib/types/api/schemas"
import { AnthropicAdapter } from "@/shared/src/adapters/anthropic"
import { generateIssueTitle } from "@/shared/src/services/workflows/generateIssueTitle"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = IssueTitleRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      )
    }

    const { description } = validation.data
    const llm = new AnthropicAdapter()
    const title = await generateIssueTitle(llm, description, {
      model: "claude-3-haiku-20240307",
      maxTokens: 64,
    })

    const responseValidation = IssueTitleResponseSchema.safeParse({
      title: title.trim(),
    })

    if (!responseValidation.success) {
      return NextResponse.json(
        { error: "Invalid response format" },
        { status: 500 }
      )
    }

    return NextResponse.json(responseValidation.data)
  } catch (err) {
    return NextResponse.json(
      {
        error:
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : "Unknown error",
      },
      { status: 500 }
    )
  }
}
