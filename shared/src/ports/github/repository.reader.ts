import { type Result } from "@/entities/result"

export interface RepositoryRef {
  /** Full repository name (owner/repo) */
  repoFullName: string
}

export interface RepositoryDetails extends RepositoryRef {
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
  getRepository(
    ref: RepositoryRef
  ): Promise<Result<RepositoryDetails, GetRepositoryErrors>>

  /**
   * Returns a de-duplicated list of repository full names ("owner/repo").
   */
  listUserAccessibleRepoFullNames(): Promise<
    Result<string[], GetRepositoryErrors>
  >
}
