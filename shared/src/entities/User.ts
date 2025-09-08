export interface User {
  /** Stable, provider-agnostic internal user id (maps to Neo4j/Github user "username" for now). */
  id: string
  /** Optional human-friendly display name. */
  displayName?: string
  /** Optional legacy GitHub login kept for migrations and cross-references. */
  githubLogin?: string
}
