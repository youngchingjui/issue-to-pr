import type { LLMPort } from "@shared/ports/llm"

const SYSTEM_PROMPT =
  "You are an expert GitHub assistant. Given an issue title and body, produce a concise, actionable summary (2-4 sentences) highlighting the problem, scope, and desired outcome. Return only the summary text."

export async function summarizeIssue(
  llm: LLMPort,
  params: { title?: string; body?: string },
  options: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const { title, body } = params
  const { model, maxTokens } = options

  const userPrompt = `Title: ${title ?? "(none)"}\n\nBody:\n${body ?? "(empty)"}`

  const result = await llm.createCompletion({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    model,
    maxTokens,
  })

  if (!result.ok) {
    const reason = "error" in result ? result.error : "unknown"
    throw new Error(`LLM error: ${reason}`)
  }

  return result.value.trim()
}

export default summarizeIssue
