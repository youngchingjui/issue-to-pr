import { NextRequest, NextResponse } from "next/server"

import { Message, OpenAIAdapter, runBasicAgent } from "@/shared/src"

// TODO: We should see the fuller path of where these imports come from in the shared folder, instead of being smushed together in index.ts barrel file
// TODO: This route should be `POST /api/agent/chat` or something
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      system = "You are a helpful assistant.",
      userMessage = "Say hello",
      model,
      maxTokens,
    } = body

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set")
    }
    const agent = new OpenAIAdapter(apiKey)
    const messages: Message[] = [{ role: "user", content: userMessage }]
    const text = await runBasicAgent({
      agent,
      prompt: { role: "system", content: system },
      messages,
      model,
      maxTokens,
    })

    return NextResponse.json({ ok: true, text })
  } catch (error) {
    console.error("/api/llm/chat error", error)
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    )
  }
}
