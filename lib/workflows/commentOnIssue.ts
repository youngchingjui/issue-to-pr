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
import { checkIfGitExists, addWorktree, updateToLatest } from "@/lib/git"
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

  // Get the local repo directory and append issue number to ensure unique worktree
  const baseDirPath = await getLocalRepoDir(repo.full_name)
  const dirPath = `${baseDirPath}-issue-${issueNumber}` // Use unique directory for each issue

  // Ensure .git is initialized and setup worktree in directory
  const gitExists = await checkIfGitExists(baseDirPath)
  if (gitExists) {
    // Add a worktree for this particular issue
    await addWorktree(baseDirPath, dirPath, `issue-${issueNumber}`)
  } else {
    // Clone the repo first if it doesn't exist
    const cloneUrlWithToken = getCloneUrlWithAccessToken(repo.full_name, token)
    await cloneRepo(cloneUrlWithToken, baseDirPath)
    await addWorktree(baseDirPath, dirPath, `issue-${issueNumber}`)
  }

  // Update worktree to latest
  await updateToLatest(dirPath)

  const tree = await createDirectoryTree(dirPath)

  const getFileContentTool = new GetFileContentTool(dirPath)

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

  // Return the comment
  return { status: "complete", issueComment }
}
