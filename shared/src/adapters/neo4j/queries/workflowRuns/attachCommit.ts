import type { ManagedTransaction, QueryResult } from "neo4j-driver"

const QUERY = `
  // Find the WorkflowRun and its Repository (if attached)
  MATCH (wr:WorkflowRun { id: $runId })
  OPTIONAL MATCH (wr)-[:BASED_ON_REPOSITORY]->(repo:Repository)

  // MERGE Commit
  MERGE (commit:Commit { sha: $commitSha })
  ON CREATE SET commit.nodeId = $commitNodeId,
                commit.message = $commitMessage,
                commit.createdAt = datetime()

  // Create or update relationships
  MERGE (wr)-[:BASED_ON_COMMIT]->(commit)

  // Link commit to repository if it exists
  FOREACH (_ IN CASE WHEN repo IS NOT NULL THEN [1] ELSE [] END |
    MERGE (commit)-[:IN_REPOSITORY]->(repo)
  )

  RETURN wr.id AS runId
`

export interface AttachCommitParams {
  runId: string
  commitSha: string
  commitNodeId?: string
  commitMessage?: string
}

export interface AttachCommitResult {
  runId: string
}

export async function attachCommit(
  tx: ManagedTransaction,
  params: AttachCommitParams
): Promise<QueryResult<AttachCommitResult>> {
  return await tx.run<AttachCommitResult>(QUERY, {
    runId: params.runId,
    commitSha: params.commitSha,
    commitNodeId: params.commitNodeId ?? null,
    commitMessage: params.commitMessage ?? null,
  })
}
