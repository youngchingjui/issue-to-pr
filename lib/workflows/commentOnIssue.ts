// This workflow uses an LLM to understand a Github issue,
// Explore possibilities, understand the codebase,
// Then generates a post as a comment on the issue.
// The comment should include the following sections:
// - Understanding the issue
// - Possible solutions
// - Relevant code
// - Suggested plan

import { auth } from "@/auth"
import { ThinkerAgent } from "@/lib/agents/thinker"
import { createDirectoryTree, getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists, cloneRepo, updateToLatest } from "@/lib/git"
import { createIssueComment, getIssue } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import GetFileContentTool from "@/lib/tools/GetFileContent"
import { GitHubRepository } from "@/lib/types"
import { getCloneUrlWithAccessToken, updateJobStatus } from "@/lib/utils"

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository,
  apiKey: string,
  jobId: string
) {
  const trace = langfuse.trace({ name: "commentOnIssue" })
  const session = await auth()
  const token = session?.user?.accessToken

  updateJobStatus(jobId, "Authenticating and retrieving token")
  // Get the issue
  const issue = await getIssue({
    repo: repo.name,
    issueNumber,
  })

  updateJobStatus(jobId, "Issue retrieved successfully")

  // Get the local repo directory
  const dirPath = await getLocalRepoDir(repo.full_name)

  updateJobStatus(jobId, "Checking repository setup")
  // Ensure .git is initialized and setup in directory
  const gitExists = await checkIfGitExists(dirPath)
  if (!gitExists) {
    // Clone the repo
    const cloneUrlWithToken = getCloneUrlWithAccessToken(repo.full_name, token)
    await cloneRepo(cloneUrlWithToken, dirPath)
    updateJobStatus(jobId, "Repository cloned successfully")
  } else {
    await updateToLatest(dirPath)
    updateJobStatus(jobId, "Repository updated to latest version")
  }

  const tree = await createDirectoryTree(dirPath)
  updateJobStatus(jobId, "Directory tree created")

  const getFileContentTool = new GetFileContentTool(dirPath)

  // Create the thinker agent
  const thinker = new ThinkerAgent({ issue, apiKey, tree })
  const span = trace.span({ name: "generateComment" })
  thinker.addSpan({ span, generationName: "commentOnIssue" })
  thinker.addTool(getFileContentTool)

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

  // Return the comment
  return { status: "complete", issueComment }
}
