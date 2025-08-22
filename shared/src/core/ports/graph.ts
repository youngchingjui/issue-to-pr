// Clean-architecture port for graph database operations we need now
// Focus: tracking which repositories a user can access and at what permission level

export type RepoPermission = "ADMIN" | "MAINTAIN" | "WRITE" | "TRIAGE" | "READ"

export interface UserRepoAccessInput {
  username: string
  repos: Array<{
    fullName: string // e.g., "owner/name"
    id?: number // optional GitHub repo id
    permission: RepoPermission
  }>
}

export interface UserRepoAccessRecord {
  fullName: string
  id?: number
  permission: RepoPermission
}

// Port (interface) the application/service layer depends on
export interface UserRepositoryAccessPort {
  // Upsert user, repositories and access edges.
  // Also remove any access edges not present in the provided list (authoritative sync).
  syncUserRepositoryAccess(input: UserRepoAccessInput): Promise<void>

  // Read repositories connected to a user, with permissions
  getUserRepositoryAccess(username: string): Promise<UserRepoAccessRecord[]>
}

