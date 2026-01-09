import type { ManagedTransaction, QueryResult } from "neo4j-driver"

const QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // MERGE Repository
  MERGE (repo:Repository { id: $repoId })
  ON CREATE SET repo.nodeId = $repoNodeId,
                repo.owner = $repoOwner,
                repo.name = $repoName,
                repo.fullName = $repoFullName,
                repo.githubInstallationId = $repoGithubInstallationId,
                repo.createdAt = datetime()
  ON MATCH SET repo.fullName = $repoFullName,
               repo.githubInstallationId = coalesce($repoGithubInstallationId, repo.githubInstallationId),
               repo.owner = coalesce($repoOwner, repo.owner),
               repo.name = coalesce($repoName, repo.name)

  // Create or update relationship
  MERGE (wr)-[:BASED_ON_REPOSITORY]->(repo)

  RETURN wr.id AS runId
`

export interface AttachRepositoryParams {
  runId: string
  repoId: string
  repoNodeId?: string
  repoOwner: string
  repoName: string
  repoGithubInstallationId?: string
}

export interface AttachRepositoryResult {
  runId: string
}

export async function attachRepository(
  tx: ManagedTransaction,
  params: AttachRepositoryParams
): Promise<QueryResult<AttachRepositoryResult>> {
  const {
    runId,
    repoId,
    repoNodeId,
    repoOwner,
    repoName,
    repoGithubInstallationId,
  } = params
  return await tx.run<AttachRepositoryResult>(QUERY, {
    runId: runId,
    repoId: repoId,
    repoNodeId: repoNodeId ?? null,
    repoFullName: repoOwner + "/" + repoName,
    repoOwner: repoOwner,
    repoName: repoName,
    repoGithubInstallationId: repoGithubInstallationId ?? null,
  })
}
