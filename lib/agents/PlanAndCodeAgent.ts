import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

const SYSTEM_PROMPT = `
You are a senior software engineer tasked with fully resolving GitHub issues.
First, analyze the issue thoroughly and brainstorm a few possible solutions. After reflecting, choose the best approach.
Then implement the necessary code changes using your available tools.
Refer to codebase configuration files to best understand coding styles, conventions, code structure and organization.
Write the PR that you think has the highest chance of being approved. 
Therefore, you'll probably consider running linting and testing if they exist.
Once the work is complete, create a pull request referencing the issue.
`

export class PlanAndCodeAgent extends Agent {
  constructor(params: AgentConstructorParams) {
    super({ model: "o3", ...params })
    this.setSystemPrompt(SYSTEM_PROMPT).catch((error) => {
      console.error("Error initializing PlanAndCodeAgent system prompt:", error)
    })
  }
}

export default PlanAndCodeAgent
