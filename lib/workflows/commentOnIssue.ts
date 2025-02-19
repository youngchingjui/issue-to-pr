import { ThinkerAgent } from "@/lib/agents/thinker"
import { createDirectoryTree } from "@/lib/fs"
import {
  createIssueComment,
  getIssue,
  updateIssueComment,
} from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import { updateJobStatus } from "@/lib/redis"
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
  const initialCommentId = initialComment.id

  updateJobStatus(jobId, "Setting up the local repository")
  // Setup local repository using setupLocalRepository
  const dirPath = await setupLocalRepository({
    repoFullName: repo.full_name,
    workingBranch: repo.default_branch,
  })

  updateJobStatus(jobId, "Repository setup completed")

  const tree = await createDirectoryTree(dirPath)
  updateJobStatus(jobId, "Directory tree created")

  // Prepare the tools
  const getFileContentTool = new GetFileContentTool(dirPath)
  const searchCodeTool = new SearchCodeTool(repo.full_name)

  // Create the thinker agent
  const thinker = new ThinkerAgent({ issue, apiKey, tree })
  const span = trace.span({ name: "generateComment" })
  thinker.addSpan({ span, generationName: "commentOnIssue" })
  thinker.addTool(getFileContentTool)
  thinker.addTool(searchCodeTool)
  thinker.addJobId(jobId)

  updateJobStatus(jobId, "Generating comment")
  const response = await thinker.runWithFunctions()
  span.end()

  updateJobStatus(jobId, "Updating initial comment with final response")
  // Update the initial comment with the final response
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
}
