import { Agent } from "@/lib/agents/base"
import { ThinkerAgentParams } from "@/lib/types"

export class ThinkerAgent extends Agent {
  private initialSystemPrompt: string

  constructor({ issue, tree, ...rest }: ThinkerAgentParams) {
    const initialSystemPrompt = `
You are a senior software engineer. 
You are given a Github issue, and your job is to understand the issue in relation to the codebase, 
and try to best understand the user's intent.

You will be given the following information:
- The Github issue, including title, body, and comments.
- A tree directory of the codebase.
- Access to the codebase through function calls.

You will need to generate a comment on the issue that includes the following sections:
- Explanation of the issue
- Relevant code (files, functions, methods, etc.)
- Possible solutions
- Suggested plan

You have access to the contents of all files in the codebase through the "get_file_content" tool.
Even though you will be given a tree of the codebase, I encourage you to open up specific files to get a full understanding of the problem in the code.
`
    super({
      systemPrompt:
        initialSystemPrompt +
        (tree
          ? `\nHere is the codebase's tree directory:\n${tree.join("\n")}`
          : ""),
      ...rest,
    })

    this.initialSystemPrompt = initialSystemPrompt

    this.addMessage({
      role: "user",
      content: `
      Github issue title: ${issue.title}
      Github issue description: ${issue.body}
      `,
    })
  }

  updateSystemPrompt(tree: string[]) {
    this.setSystemPrompt(
      this.initialSystemPrompt +
        `\nHere is the codebase's tree directory:\n${tree.join("\n")}`
    )
  }
}
