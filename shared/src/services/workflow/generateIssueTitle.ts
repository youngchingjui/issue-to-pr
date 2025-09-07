import type { LLMPort } from "@shared/ports/llm"

const SYSTEM_PROMPT = `You are an expert technical writer tasked with crafting clear, concise GitHub issue titles.

You will be given ONLY the body/description of an issue. Your job is to derive a short, descriptive title that summarises the core problem or request so that maintainers can understand it at a glance.

Guidelines:
- Keep the title under 10 words when possible.
- Focus on the *what* and, if important, the *where* (e.g. “Fix crash in user login flow”).
- Do NOT include backticks, quotes or trailing punctuation.
- Use imperative, present-tense phrasing (e.g. “Add”, “Fix”, “Support”).
- Never start with words like “Issue:” or “Bug:”. The returned text will be inserted directly as the issue title.

Return ONLY the title text with no additional commentary.`

// TODO: `model` and `maxTokens` belongs to the `Agent` core entity (not defined yet).
// I don't know how clean architecture works, but there's a relationship between `Agent` and `LLMPort` (or `AgentPort`)
// So somewhere between those 2, the `model` and `maxTokens` should be defined, not in this service-level function.

export async function generateIssueTitle(
  llm: LLMPort,
  description: string,
  options: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const { model, maxTokens } = options
  const response = await llm.createCompletion({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: description }],
    model,
    maxTokens,
  })
  return response.trim()
}

export default generateIssueTitle
