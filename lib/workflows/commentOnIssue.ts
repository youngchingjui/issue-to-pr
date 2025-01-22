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
import { getIssue } from "@/lib/github/issues"
import { GitHubRepository } from "@/lib/types"

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository
) {
  console.log("commentOnIssue", issueNumber, repo)

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

  const thinker = new ThinkerAgent(dirPath)
  thinker.issue = issue

  await thinker.thinkAboutIssue()
  await thinker.exploreCodebase()
  await thinker.generateComment()
  // Have the LLM think about the issue. What could it mean? What is the user's intent?
  // Let the LLM explore the codebase
  // Let the LLM generate a post that includes the following sections:
  // - Understanding the issue
  // - Possible solutions
  // - Relevant code
  // - Suggested plan

  // Post the comment to the Github issue

  // Return the comment
}
