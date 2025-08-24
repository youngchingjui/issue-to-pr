import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

/*
 * IssueRequirementsAgent converts a GitHub issue (title + body)
 * into a short, actionable list of bullet-point requirements.
 */

const SYSTEM_PROMPT = `You are a meticulous product requirements analyst.
Given a GitHub issue's title and body, produce a concise list of actionable requirements.

Strict rules:
- Output ONLY a bullet list using "- " at the start of each line
- Each bullet must be a single short line, imperative voice
- No preamble, headers, code fences, or extra commentary
- Do not invent details that aren't present; if a key detail is missing, omit it rather than guessing
`

export class IssueRequirementsAgent extends Agent {
  constructor(params: AgentConstructorParams) {
    super({ model: "gpt-4.1", ...params })

    this.setSystemPrompt(SYSTEM_PROMPT)
  }
}

export default IssueRequirementsAgent
