import type { DateTime } from "neo4j-driver"

export interface RepositoryNode {
  id: string // GitHub repository ID
  nodeId: string // GitHub node_id (global ID)
  fullName: string // "owner/repo"
  owner: string // "owner"
  name: string // "repo"
  defaultBranch?: string
  visibility?: "PUBLIC" | "PRIVATE" | "INTERNAL"
  hasIssues?: boolean
  createdAt: DateTime
}

export interface UserNode {
  id: string // Internal user ID
  createdAt: DateTime
}

export interface GithubUserNode {
  id: string // GitHub user ID
  login: string // GitHub username
  createdAt: DateTime
}

export interface WorkflowRunNode {
  id: string
  type: string
  createdAt: DateTime
  postToGithub: boolean
}

