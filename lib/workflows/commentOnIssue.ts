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
import { checkIfGitExists, cloneRepo, createWorktree, removeWorktree, updateToLatest } from "@/lib/git"
import { createIssueComment, getIssue } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import GetFileContentTool from "@/lib/tools/GetFileContent"
import { GitHubRepository } from "@/lib/types"
import { getCloneUrlWithAccessToken } from "@/lib/utils"

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository,
  apiKey: string
) {
  const trace = langfuse.trace({ name: "commentOnIssue" })
  const session = await auth()
  const token = session?.user?.accessToken

  // Get the issue
  const issue = await getIssue({
    repo: repo.name,
    issueNumber,
  })

  // Get the local repo directory
  const dirPath = await getLocalRepoDir(repo.full_name)

  // Determine worktree path for the specific issue
  const worktreePath = `${dirPath}-worktree-${issueNumber}`
  const branchName = `issue-${issueNumber}`

  // Ensure .git is initialized and setup in main directory
  const gitExists = await checkIfGitExists(dirPath)
  if (!gitExists) {
    // Clone the repo
    const cloneUrlWithToken = getCloneUrlWithAccessToken(repo.full_name, token)
    await cloneRepo(cloneUrlWithToken, dirPath)
  }

  // Remove existing worktree if any
  await removeWorktree(worktreePath, true)

  // Create a worktree for the branch if not exists
  await createWorktree(worktreePath, branchName, dirPath)

  // Update to the latest state
  await updateToLatest(worktreePath)

  const tree = await createDirectoryTree(worktreePath)
  const getFileContentTool = new GetFileContentTool(worktreePath)

  // Create the thinker agent
  const thinker = new ThinkerAgent({ issue, apiKey, tree })
  const span = trace.span({ name: "generateComment" })
  thinker.addSpan({ span, generationName: "commentOnIssue" })
  thinker.addTool(getFileContentTool)

  const response = await thinker.runWithFunctions()
  span.end()

  // Post the comment to the Github issue
  const issueComment = await createIssueComment({
    issueNumber,
    repo,
    comment: response,
  })

  // Optional: Clean up worktree
  // await removeWorktree(worktreePath)

  // Return the comment
  return { status: "complete", issueComment }
}
