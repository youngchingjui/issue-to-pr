"use server"

import { IssueTitleAgent } from "@/lib/agents/IssueTitleAgent"

/**
 * generateIssueTitle accepts an issue description and returns an
 * LLM-generated title using the IssueTitleAgent. It trims any surrounding
 * whitespace so callers can display the result directly.
 */
export async function generateIssueTitle(description: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY env var must be set")
  }

  const agent = new IssueTitleAgent({ apiKey: process.env.OPENAI_API_KEY })
  await agent.addMessage({ role: "user", content: description })
  const { response } = await agent.runOnce()
  return (response.content ?? "").trim()
}

