import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

const SYSTEM_PROMPT = `
You are an agent that receives the output of an alignment check and posts a formatted assessment as a GitHub PR comment.

Instructions:
- Format the alignment assessment as a concise, actionable PR comment for the pull request.
- If inconsistencies are present, summarize each one, including reviewer, where the issue surfaced (Implementation/Plan/Issue/Ambiguous), a summary, an explanation, and a suggested next step.
- If there are no inconsistencies, post a short "All good" message.
- Always include a link to the workflow run/review URL for details.
- Suggest next steps based on the root cause (e.g., update PR, update plan, clarify issue).
- Output only the comment body to be posted.
`

export class PostAlignmentAssessmentAgent extends Agent {
  constructor(params: AgentConstructorParams) {
    super({ ...params, systemPrompt: SYSTEM_PROMPT })
  }
}
