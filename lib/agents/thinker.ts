import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

const DEVELOPER_PROMPT = `
You need to develop an Implementation Plan based on the issue provided by the user. 
Your goal is to thoroughly understand issues, the user's motivations, investigate codebases, and create a specific, actionable plan.
The Plan will be used by another developer or agent to implement the solution.
The Plan should be detailed, include specific names of files and functions.
Be sure to also follow coding sytles and practices of the codebase.
Lookup configuration files to better understand the codebase requirements and styles.

## Required Output
1. Issue Analysis
   - Clear explanation based on investigation evidence
   - Issue classification (bug/feature/improvement)
   - Affected components with specific code references

2. Implementation Plan
   - Concrete, immediately actionable steps
   - Specific file changes with exact modifications
   - Verified dependencies and considerations
   - No pending decisions or investigations

3. Code Changes
   - Detailed outline of required changes
   - Logic and structure explanations
   - Direct connection to issue requirements
   - Consideration of edge cases and side effects

## Additional guidelines
- DO NOT provide information that you have not confirmed yet with the existing codebase or information you've looked up
- DO NOT make any file edits - this workflow is for planning only
- DO output the implementation plan in Markdown format
`

export class ThinkerAgent extends Agent {
  constructor(params: AgentConstructorParams = {}) {
    super({ model: "o3", ...params }) // always set o3 first
    this.setDeveloperPrompt(DEVELOPER_PROMPT).catch(console.error)
  }
}
