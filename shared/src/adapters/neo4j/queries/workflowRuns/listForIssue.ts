import {
  Integer,
  ManagedTransaction,
  Node,
  type QueryResult,
} from "neo4j-driver"

import {
  type Commit,
  type Issue,
  type WorkflowRun,
  type WorkflowRunState,
} from "@/shared/adapters/neo4j/types"

const QUERY = `
  MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue {number: $issue.number, repoFullName: $issue.repoFullName})
  OPTIONAL MATCH (w)-[:BASED_ON_COMMIT]->(c:Commit)
  OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
  WITH w, c, e, i
  ORDER BY e.createdAt DESC
  WITH w, c, collect(e)[0] as latestWorkflowState, i
  RETURN w, latestWorkflowState.state AS state, i, c
`

export interface ListForIssueParams {
  issue: { number: number; repoFullName: string }
}

export interface ListForIssueResult {
  w: Node<Integer, WorkflowRun, "WorkflowRun">
  state: WorkflowRunState | null
  i: Node<Integer, Issue, "Issue">
  c: Node<Integer, Commit, "Commit"> | null
}

export async function listForIssue(
  tx: ManagedTransaction,
  params: ListForIssueParams
): Promise<QueryResult<ListForIssueResult>> {
  return await tx.run<ListForIssueResult>(QUERY, params)
}
