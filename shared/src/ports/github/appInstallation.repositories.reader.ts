import { type Result } from "@/entities/result"

export type ListUserAppInstallationReposErrors =
  | "AuthRequired"
  | "RateLimited"
  | "Unknown"

/**
 * Port for listing repositories that:
 *  - the current authenticated user has access to, and
 *  - have our GitHub App installed for that user's installations.
 *
 * Implementations should return minimal data (full names) to keep payloads small.
 */
export interface AppInstallationRepositoriesReaderPort {
  /**
   * Returns a de-duplicated list of repository full names ("owner/repo").
   */
  listUserAccessibleRepoFullNames(): Promise<
    Result<string[], ListUserAppInstallationReposErrors>
  >
}
