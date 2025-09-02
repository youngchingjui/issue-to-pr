import type { LLMMessage, LLMPort } from "@shared/core/ports/llm"

function toKebab(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

/**
 * Lightweight, dependency-free LLM adapter that derives a concise slug from the user message.
 *
 * This avoids requiring external API keys just to generate branch names. It satisfies the
 * LLMPort contract sufficiently for our generateNonConflictingBranchName use case.
 */
export class BasicLLMAdapter implements LLMPort {
  async createCompletion({ system, messages }: { system?: string; messages: LLMMessage[] }): Promise<string> {
    // Prefer the latest user message content
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    const base = lastUser?.content ?? messages.map((m) => m.content).join(" ")

    // Extract after "Context:" if provided in the prompt
    const match = /Context:\n([\s\S]*)/i.exec(base)
    const contextText = (match?.[1] ?? base).trim()

    // Take the first 8 words to form a concise slug
    const firstWords = contextText.split(/\s+/).slice(0, 8).join(" ")
    return toKebab(firstWords).slice(0, 60)
  }
}

export default BasicLLMAdapter

