import { Agent } from "@/lib/agents/base"
import { ThinkerAgentParams } from "@/lib/types"

export class ThinkerAgent extends Agent {
  private initialSystemPrompt: string

  constructor({ issue, tree, ...rest }: ThinkerAgentParams) {
    const initialSystemPrompt = `
## Instructions
You are a senior software engineer. 
You are given a Github issue, and your job is to understand the issue in relation to the codebase, 
and try to best understand the user's intent.

You will be given the following information:
- The Github issue, including title, body, and comments.
- A tree directory of the codebase.
- Access to the codebase through function calls.

## Tools
You have access to the following tools:
- get_file_content: Get the content of a file in the codebase.
- search_code: Search the codebase for a given query. Useful if you need to follow module imports/exports to update connected code.

## Sections
You will need to generate a comment on the issue that includes the following sections:
- Explanation of the issue
- Relevant code (files, functions, methods, etc.)
- Possible solutions
- Suggested plan

## General guidance
- If a codebase already handles a similar feature, check how it works before writing new logic.
- Ensure consistency with existing patterns in the code.
- Identify all functions and files involved in the feature, not just the one that looks like the main entry point.
- If a function calls other functions, trace the entire execution flow before making changes.
- Fetch and review downstream function definitions that may modify key behavior.
- Open specific files to get a full understanding of the problem in the code
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
