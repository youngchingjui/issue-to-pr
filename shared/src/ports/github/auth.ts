import type { graphql } from "@octokit/graphql"
import type { Octokit } from "@octokit/rest"

export type GitHubAuthTarget =
  | { kind: "user" } // use current user session
  | { kind: "installation"; installationId: number } // from webhook payload
  | { kind: "repoInstallation"; repoFullName: string } // resolve installation for repo

export type GitHubAuthKind = "user" | "installation"

export interface GitHubClientBundle {
  rest: Octokit
  graphql: typeof graphql
  kind: GitHubAuthKind
}

/**
 * Abstracts *how* we authenticate against GitHub.
 * Callers specify "what identity" they want via GitHubAuthTarget.
 */
export interface GitHubAuthProvider {
  getClient(target: GitHubAuthTarget): Promise<GitHubClientBundle>
}
