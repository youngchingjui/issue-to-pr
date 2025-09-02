import type { GitHubRefsPort } from "@shared/core/ports/refs"

import { listBranchesSortedByCommitDate } from "@/lib/github/refs"

/**
 * Adapter implementing the shared GitHubRefsPort using our app's GitHub client utilities.
 */
export class GitHubRefsAdapter implements GitHubRefsPort {
  async listBranches({ owner, repo }: { owner: string; repo: string }): Promise<string[]> {
    try {
      const branches = await listBranchesSortedByCommitDate({ owner, repo, fullName: `${owner}/${repo}` })
      return branches.map((b) => b.name)
    } catch (e) {
      console.warn(`[WARNING] Failed to list branches for ${owner}/${repo}:`, e)
      return []
    }
  }
}

export default GitHubRefsAdapter

