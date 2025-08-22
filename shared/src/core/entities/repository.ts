// Minimal domain entities for repositories and users, used by services/ports
export type RepositoryRef = {
  fullName: string // owner/name
  id?: number
}

export type UserRef = {
  username: string
}

