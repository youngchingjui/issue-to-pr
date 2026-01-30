import { type Result } from "@/shared/entities/result"

export interface Repo {
  /** Full repository name (owner/repo) */
  fullName: string
}

export interface RepoDetails extends Repo {
  /** GitHub numeric repository ID (immutable) */
  id: number
  /** GitHub global node ID (immutable) */
  nodeId: string
  /** Repository owner (mutable - can change via org transfers) */
  owner: string
  /** Repository name (mutable - can be renamed) */
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
  /** Whether the repository has issues enabled */
  has_issues: boolean
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
