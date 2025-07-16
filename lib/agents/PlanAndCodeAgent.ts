import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

const SYSTEM_PROMPT = `You are a senior software engineer tasked with fully resolving GitHub issues.\n\nFirst, analyze the issue thoroughly and brainstorm a few possible solutions. After reflecting, choose the best approach.\n\nThen implement the necessary code changes using your available tools. Once the work is complete, create a pull request referencing the issue.`

export class PlanAndCodeAgent extends Agent {
  constructor({ ...rest }: AgentConstructorParams) {
    super(rest)
    this.setSystemPrompt(SYSTEM_PROMPT).catch((error) => {
      console.error("Error initializing PlanAndCodeAgent system prompt:", error)
    })
  }
}

export default PlanAndCodeAgent
