import type { ManagedTransaction, QueryResult } from "neo4j-driver"

const USER_ACTOR_QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // MERGE User actor
  MERGE (actor:User {id: $actorUserId})
  ON CREATE SET actor.createdAt = datetime()

  WITH wr, actor
  // Remove any existing INITIATED_BY relationships
  OPTIONAL MATCH (wr)-[oldRel:INITIATED_BY]->()
  DELETE oldRel

  WITH wr, actor
  // Create new relationship
  MERGE (wr)-[:INITIATED_BY]->(actor)

  RETURN wr.id AS runId
`

const GITHUB_USER_ACTOR_QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // MERGE GithubUser actor
  MERGE (actor:GithubUser {id: $actorGithubUserId})
  ON CREATE SET actor.login = $actorGithubUserLogin, actor.createdAt = datetime()

  WITH wr, actor
  // Remove any existing INITIATED_BY relationships
  OPTIONAL MATCH (wr)-[oldRel:INITIATED_BY]->()
  DELETE oldRel

  WITH wr, actor
  // Create new relationship
  MERGE (wr)-[:INITIATED_BY]->(actor)

  RETURN wr.id AS runId
`

const WEBHOOK_ACTOR_QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // MERGE GithubUser actor
  MERGE (actor:GithubUser {id: $actorGithubUserId})
  ON CREATE SET actor.login = $actorGithubUserLogin, actor.createdAt = datetime()

  // MERGE GithubWebhookEvent
  MERGE (webhookEvent:GithubWebhookEvent {id: $webhookEventId})
  ON CREATE SET webhookEvent.event = $webhookEvent,
                webhookEvent.action = $webhookAction,
                webhookEvent.createdAt = datetime()

  // Link webhook event to sender
  MERGE (webhookEvent)-[:SENDER]->(actor)

  WITH wr, webhookEvent
  // Remove any existing TRIGGERED_BY relationships
  OPTIONAL MATCH (wr)-[oldRel:TRIGGERED_BY]->()
  DELETE oldRel

  WITH wr, webhookEvent
  // Create new TRIGGERED_BY relationship for webhook-initiated runs
  MERGE (wr)-[:TRIGGERED_BY]->(webhookEvent)

  RETURN wr.id AS runId
`

type ActorParams =
  | { actorType: "user"; actorUserId: string }
  | {
      actorType: "githubUser"
      actorGithubUserId: string
      actorGithubUserLogin: string
    }
  | {
      actorType: "webhook"
      actorGithubUserId: string
      actorGithubUserLogin: string
      webhookEventId: string
      webhookEvent: string
      webhookAction: string
    }

export interface AttachActorParams {
  runId: string
  actor: ActorParams
}

export interface AttachActorResult {
  runId: string
}

export async function attachActor(
  tx: ManagedTransaction,
  params: AttachActorParams
): Promise<QueryResult<AttachActorResult>> {
  let query: string
  const cypherParams: Record<string, unknown> = {
    runId: params.runId,
  }

  if (params.actor.actorType === "user") {
    query = USER_ACTOR_QUERY
    cypherParams.actorUserId = params.actor.actorUserId
  } else if (params.actor.actorType === "webhook") {
    query = WEBHOOK_ACTOR_QUERY
    cypherParams.actorGithubUserId = params.actor.actorGithubUserId
    cypherParams.actorGithubUserLogin = params.actor.actorGithubUserLogin
    cypherParams.webhookEventId = params.actor.webhookEventId
    cypherParams.webhookEvent = params.actor.webhookEvent
    cypherParams.webhookAction = params.actor.webhookAction
  } else {
    query = GITHUB_USER_ACTOR_QUERY
    cypherParams.actorGithubUserId = params.actor.actorGithubUserId
    cypherParams.actorGithubUserLogin = params.actor.actorGithubUserLogin
  }

  return await tx.run<AttachActorResult>(query, cypherParams)
}
