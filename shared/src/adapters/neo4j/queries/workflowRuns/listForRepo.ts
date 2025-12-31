import { Integer, ManagedTransaction, Node, QueryResult } from "neo4j-driver"

import {
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
  OPTIONAL MATCH (w)-[:INITIATED_BY]->(initiator)
  OPTIONAL MATCH (initiator:User)-[:LINKED_GITHUB_USER]->(gh:GithubUser)
  OPTIONAL MATCH (w)-[:INITIATED_BY]->(webhookEvent:GithubWebhookEvent)-[:SENDER]->(webhookGh:GithubUser)
  OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
  OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
  WITH w, initiator, gh, webhookEvent, webhookGh, i, r, e
  ORDER BY e.createdAt DESC
  WITH w, initiator, gh, webhookEvent, webhookGh, i, r, collect(e)[0] as latestWorkflowState
  RETURN w, initiator, gh, webhookEvent, webhookGh, latestWorkflowState.state AS state, i, r
`

export interface ListForRepoParams {
  repo: { id?: string; fullName: string }
}

export interface ListForRepoResult {
  w: Node<Integer, WorkflowRun, "WorkflowRun">
  initiator:
    | Node<Integer, User, "User">
    | Node<Integer, GithubWebhookEvent, "GithubWebhookEvent">
    | null
  gh: Node<Integer, GithubUser, "GithubUser"> | null
  webhookEvent: Node<Integer, GithubWebhookEvent, "GithubWebhookEvent"> | null
  webhookGh: Node<Integer, GithubUser, "GithubUser"> | null
  state: WorkflowRunState
  i: Node<Integer, Issue, "Issue"> | null
  r: Node<Integer, Repository, "Repository">
}

export async function listForRepo(
  tx: ManagedTransaction,
  params: ListForRepoParams
): Promise<QueryResult<ListForRepoResult>> {
  return await tx.run<ListForRepoResult>(QUERY, params)
}
