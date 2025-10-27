import { type Result } from "@/entities/result"

export interface Repo {
  /** Full repository name (owner/repo) */
  fullName: string
}

export interface RepoDetails extends Repo {
  /** Repository owner */
  owner: string
  /** Repository name */
  name: string
  /** Short description of the repository */
  description: string | null
  /** Default branch name */
  defaultBranch: string
  /** Repository visibility */
  visibility: "PUBLIC" | "PRIVATE" | "INTERNAL"
  /** HTML URL of the repository */
  url: string
  /** Clone URL (HTTPS) */
  cloneUrl: string
}

export type GetRepositoryErrors =
  | "AuthRequired"
  | "RepoNotFound"
  | "Forbidden"
  | "RateLimited"
  | "Unknown"

/**
 * Abstraction over GitHub for reading repository metadata.
 */
export interface RepositoryReaderPort {
  /**
   * Fetch basic repository metadata used across workflows.
   */
  getRepo(ref: Repo): Promise<Result<RepoDetails, GetRepositoryErrors>>

  /**
   * Returns a de-duplicated list of repository full names ("owner/repo").
   */
  listUserAccessibleRepoFullNames(): Promise<
    Result<string[], GetRepositoryErrors>
  >
}
