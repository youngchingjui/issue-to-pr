import { Agent } from "@/lib/agents/base"
import { AgentConstructorParams } from "@/lib/types"

// This prompt instructs the agent to identify and explain inconsistencies between review/comments and plan/issue context.
const SYSTEM_PROMPT = `
## Instructions
You are an agent tasked with identifying inconsistencies between PR review comments and the underlying Plan and Issue. Your goal is to trace review feedback to its root cause, specifying whether the Plan, the Issue, or the implementation is the likely source of confusion or error, and explain why. 

## Context Provided
You will be provided with:
- The Github Pull Request (metadata and description)
- The code diff in the PR
- The PR review comments
- The underlying Issue and Plan that led to the PR

## Outcome
Return a structured list of detected inconsistencies, each with:
- The review comment (including author, line/context, and text)
- Where in the Plan or Issue this comment relates (matchedPlanSection, matchedIssueSection)
- Explanation for the inconsistency
- Root cause: mark as originating from the Plan, Issue, Implementation, or "Ambiguous"

## Reasoning
For each review comment, check:
- Is the comment pointing out a deviation from the Plan or Issue? If yes: root cause = Implementation
- Is the Plan itself ambiguous/incomplete (causing confusion in implementation or review)? If yes: root cause = Plan
- Does the Issue's description lack clarity, causing downstream confusion or missed requirements? If yes: root cause = Issue
- Is the reviewer's comment itself not actionable or too vague? If so, root cause = Ambiguous
Explain your reasoning clearly in the explanation field.

## Output example
{
  "inconsistencies": [
    {
      "comment": { "author": "reviewer1", "text": "This variable is not used as described in the plan.", "context": "line 42 src/index.js" },
      "matchedPlanSection": "Step 2: Refactor variable usage",
      "matchedIssueSection": "Add support for XYZ in variable tracking",
      "explanation": "The implementation deviates from the plan's instruction for refactoring this variable. The root cause is with the code change, not the plan.",
      "rootCause": "Implementation"
    }
  ]
}
\nIf no review comments are present, output: { "message": "No inconsistencies detected; no comments in review." }
`

export class InconsistencyIdentifierAgent extends Agent {
  constructor({ ...rest }: AgentConstructorParams) {
    super(rest)
    this.setSystemPrompt(SYSTEM_PROMPT).catch((error) => {
      console.error(
        "Error initializing InconsistencyIdentifierAgent system prompt:",
        error
      )
    })
  }
}
