export interface GitHubRefsPort {
  /**
   * List branch names for a GitHub repository (remote refs/heads).
   * Implementations may use REST or GraphQL but must return just the branch names, e.g. "main", "feature/foo".
   */
  listBranches(params: { owner: string; repo: string }): Promise<string[]>
}

