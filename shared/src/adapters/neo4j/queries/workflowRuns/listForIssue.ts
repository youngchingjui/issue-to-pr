import { Integer, ManagedTransaction, Node, QueryResult } from "neo4j-driver"

import {
  Issue,
  WorkflowRun,
  WorkflowRunState,
} from "@/shared/adapters/neo4j/types"

const QUERY = `
  MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue {number: $issue.number, repoFullName: $issue.repoFullName})
  OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
  WITH w, e, i
  ORDER BY e.createdAt DESC
  WITH w, collect(e)[0] as latestWorkflowState, i
  RETURN w, latestWorkflowState.state AS state, i
`

export interface ListForIssueParams {
  issue: { number: number; repoFullName: string }
}

export interface ListForIssueResult {
  w: Node<Integer, WorkflowRun, "WorkflowRun">
  state: WorkflowRunState
  i: Node<Integer, Issue, "Issue">
}

export async function listForIssue(
  tx: ManagedTransaction,
  params: ListForIssueParams
): Promise<QueryResult<ListForIssueResult>> {
  return await tx.run<ListForIssueResult>(QUERY, params)
}
