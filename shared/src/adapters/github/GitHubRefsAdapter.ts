// TODO: This belongs in @/shared folder
// And also we'll have to make a specific octokit REST/GraphQL implementation
// of this functionality, basically similar to
// listBranchesSortedByCommitDate
// but separate the concerns and save it in @/shared folder

import { listBranchesSortedByCommitDate } from "@/shared/lib/github/refs"
import type { GitHubRefsPort } from "@/shared/ports/github/branch.reader"

/**
 * Adapter implementing the shared GitHubRefsPort using our app's GitHub client utilities.
 */
export class GitHubRefsAdapter implements GitHubRefsPort {
  async listBranches({
    owner,
    repo,
  }: {
    owner: string
    repo: string
  }): Promise<string[]> {
    try {
      const branches = await listBranchesSortedByCommitDate({
        owner,
        repo,
        fullName: `${owner}/${repo}`,
      })
      return branches.map((b) => b.name)
    } catch (e) {
      console.warn(`[WARNING] Failed to list branches for ${owner}/${repo}:`, e)
      return []
    }
  }
}

export default GitHubRefsAdapter
