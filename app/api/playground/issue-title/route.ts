import { NextRequest, NextResponse } from "next/server"

import IssueTitleAgent from "@/lib/agents/IssueTitleAgent"
import { getUserOpenAIApiKey } from "@/lib/neo4j/services/user"

export async function POST(req: NextRequest) {
  try {
    const { description } = (await req.json()) as { description?: string }
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      )
    }

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

    return NextResponse.json({ title: response.content.trim() })
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

