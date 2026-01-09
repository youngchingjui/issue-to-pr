import {
  Integer,
  type ManagedTransaction,
  type Node,
  type QueryResult,
} from "neo4j-driver"

import type {
  Commit,
  GithubUser,
  GithubWebhookEvent,
  Issue,
  Repository,
  WorkflowRun,
} from "../../types"

const QUERY = `
  MATCH (wr:WorkflowRun { id: $id })
  OPTIONAL MATCH (wr)-[:BASED_ON_REPOSITORY]->(repo:Repository)
  OPTIONAL MATCH (wr)-[:BASED_ON_ISSUE]->(issue:Issue)
  OPTIONAL MATCH (wr)-[:BASED_ON_COMMIT]->(commit:Commit)

  // Get actor node for user-initiated workflows
  OPTIONAL MATCH (wr)-[:INITIATED_BY]->(actor:User)

  // For webhook-triggered workflows, get the webhook event and sender
  OPTIONAL MATCH (wr)-[:TRIGGERED_BY]->(webhookEvent:GithubWebhookEvent)-[:SENDER]->(sender:GithubUser)

  RETURN wr, repo, issue, commit, actor, webhookEvent, sender
`

export interface GetWorkflowRunByIdParams {
  id: string
}

export interface GetWorkflowRunByIdResult {
  wr: Node<Integer, WorkflowRun, "WorkflowRun"> // Required
  repo: Node<Integer, Repository, "Repository"> | null
  issue: Node<Integer, Issue, "Issue"> | null
  commit: Node<Integer, Commit, "Commit"> | null
  actor: Node | null // User node for user-initiated workflows
  webhookEvent: Node<Integer, GithubWebhookEvent, "GithubWebhookEvent"> | null
  sender: Node<Integer, GithubUser, "GithubUser"> | null
}

export async function getWorkflowRunById(
  tx: ManagedTransaction,
  params: GetWorkflowRunByIdParams
): Promise<QueryResult<GetWorkflowRunByIdResult>> {
  return await tx.run<GetWorkflowRunByIdResult>(QUERY, params)
}
