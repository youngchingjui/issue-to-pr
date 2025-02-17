import { ThinkerAgent } from "@/lib/agents/thinker"
import { createDirectoryTree } from "@/lib/fs"
import { createIssueComment, getIssue } from "@/lib/github/issues"
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

  updateJobStatus(jobId, "Setting up the local repository")
  // Setup local repository using setupLocalRepository
  const dirPath = await setupLocalRepository({ repoFullName: repo.full_name })

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

  updateJobStatus(jobId, "Posting comment to GitHub issue")
  // Post the comment to the Github issue
  const issueComment = await createIssueComment({
    issueNumber,
    repo,
    comment: response,
  })

  updateJobStatus(jobId, "Comment posted successfully")

  // Send a final message indicating the stream is finished
  updateJobStatus(jobId, "Stream finished")

  // Return the comment
  return { status: "complete", issueComment }
}
