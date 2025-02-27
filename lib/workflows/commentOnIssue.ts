import { ContextAgent, ThinkerAgent } from "@/lib/agents"
import { createDirectoryTree } from "@/lib/fs"
import {
  createIssueComment,
  getIssue,
  updateIssueComment,
} from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import { updateJobStatus } from "@/lib/redis-old"
import { SearchCodeTool } from "@/lib/tools"
import GetFileContentTool from "@/lib/tools/GetFileContent"
import { GitHubRepository } from "@/lib/types"
import { setupLocalRepository } from "@/lib/utils-server"

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository,
  apiKey: string,
  jobId: string
) {
  const trace = langfuse.trace({ name: "commentOnIssue" })
  let initialCommentId: number | null = null

  try {
    updateJobStatus(jobId, "Authenticating and retrieving token")
    // Get the issue
    const issue = await getIssue({
      fullName: repo.full_name,
      issueNumber,
    })

    updateJobStatus(jobId, "Issue retrieved successfully")

    // Post initial comment indicating processing start
    updateJobStatus(jobId, "Posting initial processing comment")
    const initialComment = await createIssueComment({
      issueNumber,
      repoFullName: repo.full_name,
      comment: "[Issue To PR] Generating plan...please wait a minute.",
    })
    initialCommentId = initialComment.id

    updateJobStatus(jobId, "Setting up the local repository")
    // Setup local repository using setupLocalRepository
    const dirPath = await setupLocalRepository({
      repoFullName: repo.full_name,
      workingBranch: repo.default_branch,
    })

    updateJobStatus(jobId, "Repository setup completed")

    const tree = await createDirectoryTree(dirPath)
    updateJobStatus(jobId, "Directory tree created")

    updateJobStatus(jobId, "Preparing tools")
    // Prepare the tools
    const getFileContentTool = new GetFileContentTool(dirPath)
    const searchCodeTool = new SearchCodeTool(repo.full_name)

    // Setup the context agent
    updateJobStatus(jobId, "Preparing Context Agent")
    const contextAgent = new ContextAgent()
    contextAgent.addApiKey(apiKey)
    contextAgent.addTool(getFileContentTool)
    contextAgent.addTool(searchCodeTool)
    contextAgent.addJobId(jobId)

    // Add initial messages for specific context
    contextAgent.addMessage({
      role: "user",
      content: `
      Here is the codebase's tree directory:
      ${tree.join("\n")}
      `,
    })
    contextAgent.addMessage({
      role: "user",
      content: `
      Github issue title: ${issue.title}
      Github issue description: ${issue.body}
      `,
    })

    // Add observability to the context agent
    const contextSpan = trace.span({ name: "Gather context" })
    contextAgent.addSpan({
      span: contextSpan,
      generationName: "Gather context",
    })

    // Setup the thinkerAgent agent
    updateJobStatus(jobId, "Preparing Thinker Agent")
    const thinkerAgent = new ThinkerAgent()
    thinkerAgent.addApiKey(apiKey)
    const planSpan = trace.span({ name: "Generate Plan" })
    thinkerAgent.addSpan({ span: planSpan, generationName: "Generating plan" })
    thinkerAgent.addJobId(jobId)

    // Now, run the workflow, starting with the context agent
    updateJobStatus(jobId, "Running context agent")
    await contextAgent.runWithFunctions()
    contextSpan.end()
    updateJobStatus(jobId, "Context agent completed")

    // After context agent is done, we take all the generated messages from the context agent and add them to the thinkerAgent agent
    contextAgent.getMessages().forEach((message) => {
      if (message.role === "system") {
        // Skip the context agent's system prompt
        return
      }
      thinkerAgent.addMessage(message)
    })

    updateJobStatus(jobId, "Running thinkerAgent agent")
    const response = await thinkerAgent.runWithFunctions()
    planSpan.end()

    updateJobStatus(jobId, "Thinker agent completed")

    // Update the initial comment with the final response
    updateJobStatus(
      jobId,
      "Updating initial Github comment with final response"
    )
    await updateIssueComment({
      repoFullName: repo.full_name,
      commentId: initialCommentId,
      comment: response,
    })

    updateJobStatus(jobId, "Comment updated successfully")

    // Send a final message indicating the stream is finished
    updateJobStatus(jobId, "Stream finished")

    // Return the comment
    return { status: "complete", issueComment: response }
  } catch (error) {
    if (initialCommentId) {
      await updateIssueComment({
        repoFullName: repo.full_name,
        commentId: initialCommentId,
        comment: `[Issue to PR] Failed to generate a plan for this issue: ${error.message}`,
      })
    }
    updateJobStatus(jobId, "Error occurred during processing")
    throw error
  }
}
