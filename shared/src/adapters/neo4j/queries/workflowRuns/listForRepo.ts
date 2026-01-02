import { Integer, ManagedTransaction, Node, QueryResult } from "neo4j-driver"

import {
  Commit,
  GithubUser,
  GithubWebhookEvent,
  Issue,
  Repository,
  User,
  WorkflowRun,
  WorkflowRunState,
} from "@/shared/adapters/neo4j/types"

// Query workflow runs for a repository by traversing BASED_ON_REPOSITORY relationship
// Also retrieves initiator information via INITIATED_BY relationship
const QUERY = `
  MATCH (w:WorkflowRun)-[:BASED_ON_REPOSITORY]->(r:Repository {fullName: $repo.fullName})
  OPTIONAL MATCH (w)-[:INITIATED_BY]->(actor)
  OPTIONAL MATCH (actor:User)-[:LINKED_GITHUB_USER]->(userGh:GithubUser)
  OPTIONAL MATCH (actor:GithubWebhookEvent)-[:SENDER]->(webhookGh:GithubUser)
  OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
  OPTIONAL MATCH (w)-[:BASED_ON_COMMIT]->(c:Commit)
  OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
  WITH w, actor, userGh, webhookGh, i, r, c, e
  ORDER BY e.createdAt DESC
  WITH w, actor, userGh, webhookGh, i, r, c, collect(e)[0] as latestWorkflowState
  RETURN w, actor, userGh, webhookGh, latestWorkflowState.state AS state, i, r, c
`

export interface ListForRepoParams {
  repo: { id?: string; fullName: string }
}

export interface ListForRepoResult {
  w: Node<Integer, WorkflowRun, "WorkflowRun">
  actor: Node<
    Integer,
    User | GithubWebhookEvent,
    "User" | "GithubWebhookEvent"
  > | null
  userGh: Node<Integer, GithubUser, "GithubUser"> | null
  webhookGh: Node<Integer, GithubUser, "GithubUser"> | null
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
