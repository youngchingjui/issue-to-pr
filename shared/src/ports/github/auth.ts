import type { graphql } from "@octokit/graphql"
import type { Octokit } from "@octokit/rest"

/**
 * Token identity ("who am I" to GitHub).
 * - "app" is optional; many apps don't need to expose it to workflows.
 */
export type GitHubTokenKind = "user" | "installation" | "app"

export interface GitHubClientBundle<
  K extends GitHubTokenKind = GitHubTokenKind,
> {
  kind: K
  rest: Octokit
  graphql: typeof graphql
}

/** Canonical handle for “authenticate as installation” */
export type GitHubInstallationId = number

/** Inputs used to discover an installation id */
export type GitHubInstallationLookup =
  | { kind: "repo"; owner: string; repo: string }
  | { kind: "username"; username: string }
  | { kind: "org"; org: string }

/**
 * User auth token. Usually NextJS can provide this. Likely not available in worker context.
 */
export interface GitHubUserAuth {
  getUserClient(): Promise<GitHubClientBundle<"user">>
}

/**
 * Installation auth token. Usually NextJS or workers can provide this.
 */
export interface GitHubInstallationAuth {
  getInstallationClient(): Promise<GitHubClientBundle<"installation">>
}

/**
 * Optional. Only expose this if you have real consumers for app-level endpoints.
 */
export interface GitHubAppAuth {
  getAppClient(): Promise<GitHubClientBundle<"app">>
}

/**
 * Convenience alias for runtimes that can do both.
 */
export type GitHubAuthProvider = GitHubUserAuth & GitHubInstallationAuth
