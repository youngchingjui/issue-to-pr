import { Agent as BaseAgent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

const SYSTEM_PROMPT = `You are an expert technical writer.
Given ONLY a GitHub issue description, produce a concise, descriptive issue title in Title Case.
Return the title as a single line with no additional commentary.`

/**
 * IssueTitleAgent is a minimal wrapper around the core Agent that specialises in
 * transforming an issue description into a succinct title. It sets its own
 * system prompt and otherwise relies on the core Agent behaviour.
 */
export class IssueTitleAgent extends BaseAgent {
  constructor(params: AgentConstructorParams) {
    super(params)
    this.setSystemPrompt(SYSTEM_PROMPT)
  }
}

export default IssueTitleAgent

