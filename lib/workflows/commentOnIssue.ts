// This workflow uses an LLM to understand a Github issue,
// Explore possibilities, understand the codebase,
// Then generates a post as a comment on the issue.
// The comment should include the following sections:
// - Understanding the issue
// - Possible solutions
// - Relevant code
// - Suggested plan

import { GitHubRepository, Issue } from "@/lib/types"

export default async function commentOnIssue(
  issueNumber: number,
  repo: GitHubRepository
) {
  console.log("commentOnIssue", issueNumber, repo)

  let issue: Issue

  // Get the issue
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
