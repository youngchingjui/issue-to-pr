import { Integer, ManagedTransaction, Node, QueryResult } from "neo4j-driver"

import {
  Commit,
  GithubUser,
  Issue,
  User,
  WorkflowRun,
  WorkflowRunState,
} from "@/shared/adapters/neo4j/types"

const QUERY = `
  MATCH (w:WorkflowRun)-[:INITIATED_BY]->(u:User {id: $user.id})
  OPTIONAL MATCH (u)-[:LINKED_GITHUB_USER]->(gh:GithubUser)
  OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
  OPTIONAL MATCH (w)-[:BASED_ON_REPOSITORY]->(r:Repository)
  OPTIONAL MATCH (w)-[:BASED_ON_COMMIT]->(c:Commit)
  OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
  WITH w, u, gh, i, r, c, e
  ORDER BY e.createdAt DESC
  WITH w, u, gh, i, r, c, collect(e)[0] as latestWorkflowState
  RETURN w, u, gh, latestWorkflowState.state AS state, i, r, c
`

export interface ListByUserParams {
  user: { id: string }
}

export interface ListByUserResult {
  w: Node<Integer, WorkflowRun, "WorkflowRun">
  u: Node<Integer, User, "User">
  gh: Node<Integer, GithubUser, "GithubUser"> | null
  state: WorkflowRunState
  i: Node<Integer, Issue, "Issue"> | null
  r: Node<Integer, { fullName: string; id?: string }, "Repository"> | null
  c: Node<Integer, Commit, "Commit"> | null
}

export async function listByUser(
  tx: ManagedTransaction,
  params: ListByUserParams
): Promise<QueryResult<ListByUserResult>> {
  return await tx.run<ListByUserResult>(QUERY, params)
}
