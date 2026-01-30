import {
  Integer,
  ManagedTransaction,
  Node,
  type QueryResult,
} from "neo4j-driver"

import {
  type Commit,
  type GithubUser,
  type GithubWebhookEvent,
  type Issue,
  type Repository,
  type User,
  type WorkflowRun,
  type WorkflowRunState,
} from "@/shared/adapters/neo4j/types"

// Query workflow runs for a repository by traversing BASED_ON_REPOSITORY relationship
// Retrieves actor information via INITIATED_BY (for users) and TRIGGERED_BY (for webhooks)
const QUERY = `
  MATCH (w:WorkflowRun)-[:BASED_ON_REPOSITORY]->(r:Repository {fullName: $repo.fullName})
  OPTIONAL MATCH (w)-[:INITIATED_BY]->(userActor:User)
  OPTIONAL MATCH (w)-[:TRIGGERED_BY]->(webhookEvent:GithubWebhookEvent)-[:SENDER]->(webhookSender:GithubUser)
  OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
  OPTIONAL MATCH (w)-[:BASED_ON_COMMIT]->(c:Commit)
  OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
  WITH w, userActor, webhookEvent, webhookSender, i, r, c, e
  ORDER BY e.createdAt DESC
  WITH w, userActor, webhookEvent, webhookSender, i, r, c, collect(e)[0] as latestWorkflowState
  RETURN w, userActor, webhookEvent, webhookSender, latestWorkflowState.state AS state, i, r, c
`

export interface ListForRepoParams {
  repo: { id?: string; fullName: string }
}

export interface ListForRepoResult {
  w: Node<Integer, WorkflowRun, "WorkflowRun">
  userActor: Node<Integer, User, "User"> | null
  webhookEvent: Node<Integer, GithubWebhookEvent, "GithubWebhookEvent"> | null
  webhookSender: Node<Integer, GithubUser, "GithubUser"> | null
  state: WorkflowRunState
  i: Node<Integer, Issue, "Issue"> | null
  r: Node<Integer, Repository, "Repository">
  c: Node<Integer, Commit, "Commit"> | null
}

export async function listForRepo(
  tx: ManagedTransaction,
  params: ListForRepoParams
): Promise<QueryResult<ListForRepoResult>> {
  return await tx.run<ListForRepoResult>(QUERY, params)
}
