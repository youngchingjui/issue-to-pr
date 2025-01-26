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
import { getCloneUrlWithAccessToken } from "@/lib/utils"

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository,
  apiKey: string
) {
  console.log("commentOnIssue workflow", issueNumber, repo)

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

  // Ensure .git is initialized and setup in directory
  const gitExists = await checkIfGitExists(dirPath)
  if (!gitExists) {
    // Clone the repo
    // Attach access token to cloneUrl
    const cloneUrlWithToken = getCloneUrlWithAccessToken(repo.full_name, token)
    await cloneRepo(cloneUrlWithToken, dirPath)
  } else {
    await updateToLatest(dirPath)
  }

  const tree = await createDirectoryTree(dirPath)

  const getFileContentTool = new GetFileContentTool(dirPath)

  // Create the thinker agent
  const thinker = new ThinkerAgent({ issue, apiKey, tree })
  const span = trace.span({ name: "generateComment" })
  thinker.addSpan({ span, generationName: "commentOnIssue" })
  thinker.addTool(getFileContentTool)

  const response = await thinker.runWithFunctions()
  // await thinker.exploreCodebase()
  // await thinker.generateComment()
  // Have the LLM think about the issue. What could it mean? What is the user's intent? Add more details to the issue.
  // Let the LLM explore the codebase
  // Let the LLM generate a post that includes the following sections:
  // - Understanding the issue
  // - Possible solutions
  // - Relevant code
  // - Suggested plan

  // Post the comment to the Github issue
  const issueComment = await createIssueComment({
    issueNumber,
    repo,
    comment: response,
  })

  // Return the comment
  return { status: "complete", issueComment }
}
