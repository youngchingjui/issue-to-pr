import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

/*
 * IssueTitleAgent takes the body/description of a GitHub Issue (often multiple
 * paragraphs) and produces a concise, descriptive title suitable for the
 * Issue’s title field.
 */

const SYSTEM_PROMPT = `You are an expert technical writer tasked with crafting clear, concise GitHub issue titles.

You will be given ONLY the body/description of an issue.  Your job is to derive a short, descriptive title that summarises the core problem or request so that maintainers can understand it at a glance.

Guidelines:
- Keep the title under 10 words when possible.
- Focus on the *what* and, if important, the *where* (e.g. “Fix crash in user login flow”).
- Do NOT include backticks, quotes or trailing punctuation.
- Use imperative, present-tense phrasing (e.g. “Add”, “Fix”, “Support”).
- Never start with words like “Issue:” or “Bug:”.  The returned text will be inserted directly as the issue title.

Return ONLY the title text with no additional commentary.`

export class IssueTitleAgent extends Agent {
  constructor(params: AgentConstructorParams) {
    super({ model: "gpt-5", ...params })

    this.setSystemPrompt(SYSTEM_PROMPT)
  }
}

export default IssueTitleAgent
