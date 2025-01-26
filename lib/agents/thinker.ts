import { Agent } from "@/lib/agents/base"
import { Issue } from "@/lib/types"

export class ThinkerAgent extends Agent {
  constructor({ issue, apiKey }: { issue: Issue; apiKey: string }) {
    super({
      systemPrompt: `
You are a senior software engineer. 
You are given a Github issue, and your job is to understand the issue in relation to the codebase, 
and try to best understand the user's intent.

You will be given the following information:
- The Github issue, including title, body, and comments.
- Access to the codebase through function calls.

You will need to generate a comment on the issue that includes the following sections:
- Understanding the issue
- Relevant code
- Possible solutions
- Suggested plan
`,
      apiKey,
    })
    this.addMessage({
      role: "user",
      content: `
      Github issue title: ${issue.title}
      Github issue description: ${issue.body}
      `,
    })
  }
}
