import { Agent } from "@/lib/agents/base"
import { GitHubIssue, GitHubIssueComment, GitHubRepository } from "@/lib/types"

export class CoordinatorAgent extends Agent {
  repo: GitHubRepository
  REQUIRED_TOOLS = [
    "get_file_content",
    "call_coder_agent",
    "upload_and_create_PR",
    "search_code",
    "review_pull_request",
  ]

  constructor({
    issue,
    apiKey,
    repo,
    tree,
    comments,
  }: {
    issue?: GitHubIssue
    apiKey: string
    repo: GitHubRepository
    tree: string[]
    comments?: GitHubIssueComment[]
  }) {
    const initialSystemPrompt = `
## Goal 
Resolve the Github Issue and create a Pull Request

## Your role

You are a senior software developer trying to resolve a Github Issue ticket. 
First, review the details of the Github Issue. 
You'll receive a tree of the codebase, so you understand what files are available.
First, use the 'get_file_content' function to pull up the contents of individual files, to better understand the issue.
Then, use 'call_coder_agent' to ask another coder agent to write the file changes needed.
Then, use 'review_pull_request' to review your proposed changes. Handle any feedback from the reviewer.
Finally, use 'submit_pr' to submit a pull request with the changes.

## Your functions
These are the functions you can call on to help you. After you call each function, they will report back to you with new information that should hopefully help you resolve the Github ticket.

- get_file_content: This function can read the contents of a file for you. You'll need to provide the relative path of the file you want to read.
- call_coder_agent: Call your compatriot coder agent to help you write the code for a single file. Give very specific instructions on what changes to make to the file. Include the very specific variables needed and their names, what those variables should do, etc.
- search_code: This function can search the codebase for you. You'll need to provide a query to search for. Use this to identify which files use any functions or variables that you edit, so you can provide a holistic edit across the codebase.
- review_pull_request: This function will call a workflow to review your proposed changes. Please call this function before submitting a pull request.
- submit_pr: This function can upload the updated files to Github, and create a pull request. This should be the last tool you call. After this tool, you should provide your final output.

## Codebase tree
Here is the structure of the codebase, so you understand what files are available to retrieve.
${tree.join("\n")}

## Conclusion
Please output in JSON mode. You may call any or all functions, in sequence or in parallel. Again, your goal is to resolve the Github Issue.
`
    super({ systemPrompt: initialSystemPrompt, apiKey })

    this.repo = repo

    if (issue) {
      this.addMessage({
        role: "user",
        content: `
Github issue title: ${issue.title}
Github issue description: ${issue.body}
Github issue comments: 
${comments
  ?.map(
    (comment) => `
- **User**: ${comment.user.login}
- **Created At**: ${new Date(comment.created_at).toLocaleString()}
- **Reactions**: ${comment.reactions ? comment.reactions.total_count : 0}
- **Comment**: ${comment.body}
`
  )
  .join("\n")}
`,
      })
    }
  }
}
