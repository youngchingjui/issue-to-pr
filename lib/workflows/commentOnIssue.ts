// This workflow uses an LLM to understand a Github issue,
// Explore possibilities, understand the codebase,
// Then generates a post as a comment on the issue.
// The comment should include the following sections:
// - Understanding the issue
// - Possible solutions
// - Relevant code
// - Suggested plan

import { ThinkerAgent } from "@/lib/agents/thinker"
import { getLocalRepoDir } from "@/lib/fs"
import { checkIfGitExists, cloneRepo, updateToLatest } from "@/lib/git"
import { createIssueComment, getIssue } from "@/lib/github/issues"
import { langfuse } from "@/lib/langfuse"
import { GitHubRepository } from "@/lib/types"

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository,
  apiKey: string
) {
  console.log("commentOnIssue workflow", issueNumber, repo)

  const trace = langfuse.trace({ name: "commentOnIssue" })

  // Get the issue
  const issue = await getIssue({
    repo: repo.name,
    issueNumber,
  })

  // Get the local repo directory
  const dirPath = await getLocalRepoDir(repo.full_name)

  // Ensure .git is initialized and setup in directory
  if (!(await checkIfGitExists(dirPath))) {
    await cloneRepo(repo.clone_url, dirPath)
  } else {
    await updateToLatest(dirPath)
  }

  // Create the thinker agent
  const thinker = new ThinkerAgent(dirPath, trace, apiKey)
  thinker.issue = issue

  const span = trace.span({ name: "generateComment" })

  const thinking = await thinker.thinkAboutIssue(span)
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
    comment: thinking,
  })

  // Return the comment
  return { status: "complete", issueComment }
}
