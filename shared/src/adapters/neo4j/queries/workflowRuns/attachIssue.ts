import { int, type ManagedTransaction, type QueryResult } from "neo4j-driver"

const QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // MERGE Issue
  MERGE (issue:Issue { number: $issueNumber, repoFullName: $repoFullName })
  ON CREATE SET issue.createdAt = datetime()

  // Create or update relationship
  MERGE (wr)-[:BASED_ON_ISSUE]->(issue)

  RETURN wr.id AS runId
`

export interface AttachIssueParams {
  runId: string
  issueNumber: number
  repoFullName: string
}

export interface AttachIssueResult {
  runId: string
}

export async function attachIssue(
  tx: ManagedTransaction,
  params: AttachIssueParams
): Promise<QueryResult<AttachIssueResult>> {
  return await tx.run<AttachIssueResult>(QUERY, {
    runId: params.runId,
    issueNumber: int(params.issueNumber),
    repoFullName: params.repoFullName,
  })
}
