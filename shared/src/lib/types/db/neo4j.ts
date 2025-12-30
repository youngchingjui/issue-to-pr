export type Neo4jWorkflowRunDTO = {
  id: string
  type: string
  createdAt: string // ISO
  postToGithub?: boolean
}

export type Neo4jWorkflowEventDTO = {
  id?: string
  runId: string
  type: string
  payload: unknown
  createdAt: string // ISO
}

export type Neo4jIssueDTO = { repoFullName: string; number: number }
export type Neo4jRepositoryDTO = { id?: string; fullName: string }
export type Neo4jUserDTO = { id: string }
export type Neo4jGithubUserDTO = { id?: string; login?: string }
export type Neo4jInstallationDTO = { id: string }
