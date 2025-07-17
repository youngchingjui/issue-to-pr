import { NextRequest, NextResponse } from "next/server"

import IssueTitleAgent from "@/lib/agents/IssueTitleAgent"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"
import {
  IssueTitleRequestSchema,
  IssueTitleResponseSchema,
} from "@/lib/types/api/schemas"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate request body using zod schema
    const validationResult = IssueTitleRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { description } = validationResult.data

    const apiKey = await getUserOpenAIApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 500 }
      )
    }

    const agent = new IssueTitleAgent({ apiKey })
    await agent.addMessage({ role: "user", content: description })

    const { response } = await agent.runOnce()

    if (response.role !== "assistant" || typeof response.content !== "string") {
      return NextResponse.json(
        { error: "Invalid response from model" },
        { status: 500 }
      )
    }

    // Prepare and validate response using zod schema
    const responseData = { title: response.content.trim() }
    const responseValidation = IssueTitleResponseSchema.safeParse(responseData)

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
