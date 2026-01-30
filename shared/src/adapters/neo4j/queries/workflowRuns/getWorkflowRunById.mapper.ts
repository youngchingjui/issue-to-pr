import type { Node, QueryResult } from "neo4j-driver"

import type {
  WorkflowRun,
  WorkflowRunActor,
} from "@/shared/entities/WorkflowRun"

import {
  commitSchema,
  genericWebhookEventSchema,
  githubUserSchema,
  githubWebhookEventSchema,
  issueSchema,
  repositorySchema,
  userSchema,
  workflowRunSchema,
} from "../../types"
import type { GetWorkflowRunByIdResult } from "./getWorkflowRunById"

/**
 * Maps actor nodes to a WorkflowRunActor domain type
 * Handles two patterns:
 * - User-initiated: (wr)-[:INITIATED_BY]->(User)
 * - Webhook-triggered: (wr)-[:TRIGGERED_BY]->(WebhookEvent)-[:SENDER]->(GithubUser)
 */
function mapActor(
  actorNode: Node | null,
  webhookEventNode: Node | null,
  senderNode: Node | null,
  installationId: string
): WorkflowRunActor | undefined {
  // Webhook-triggered workflow
  if (webhookEventNode && senderNode) {
    const githubUser = githubUserSchema.parse(senderNode.properties)

    // Try parsing with specific schema first, fall back to generic schema
    let webhookEvent
    const parseResult = githubWebhookEventSchema.safeParse(
      webhookEventNode.properties
    )
    if (parseResult.success) {
      webhookEvent = parseResult.data
    } else {
      // Fall back to generic schema for non-standard webhook events
      webhookEvent = genericWebhookEventSchema.parse(
        webhookEventNode.properties
      )
    }

    return {
      type: "webhook",
      source: "github",
      event: webhookEvent.event,
      action: webhookEvent.action ?? "",
      sender: {
        id: githubUser.id,
        login: githubUser.login,
      },
      installationId,
    }
  }

  // User-initiated workflow
  if (actorNode) {
    const labels = Array.from(actorNode.labels || []) as string[]
    if (labels.includes("User")) {
      const user = userSchema.parse(actorNode.properties)
      return {
        type: "user",
        userId: user.id,
      }
    }
  }

  return undefined
}

/**
 * Maps Neo4j query result to domain WorkflowRun entity
 */
export function mapGetWorkflowRunById(
  result: QueryResult<GetWorkflowRunByIdResult>
): WorkflowRun | null {
  if (result.records.length === 0) return null

  const record = result.records[0]
  const wrNode = record.get("wr")
  const repoNode = record.get("repo")
  const issueNode = record.get("issue")
  const commitNode = record.get("commit")
  const actorNode = record.get("actor")
  const webhookEventNode = record.get("webhookEvent")
  const senderNode = record.get("sender")

  // Validate and parse WorkflowRun
  const wr = workflowRunSchema.parse(wrNode.properties)

  // Parse repository to get installationId
  const repo = repoNode ? repositorySchema.parse(repoNode.properties) : null
  const installationId = repo?.githubInstallationId ?? ""

  // Map optional relationships
  const actor = mapActor(
    actorNode,
    webhookEventNode,
    senderNode,
    installationId
  )
  const repository = repo ? { fullName: repo.fullName } : undefined
  const issue = issueNode
    ? (() => {
        const parsed = issueSchema.parse(issueNode.properties)
        return {
          repoFullName: parsed.repoFullName,
          number:
            typeof parsed.number === "number"
              ? parsed.number
              : parsed.number.toNumber(),
        }
      })()
    : undefined
  const commit = commitNode
    ? (() => {
        const parsed = commitSchema.parse(commitNode.properties)
        return {
          sha: parsed.sha,
          message: parsed.message,
          repository: repository!,
        }
      })()
    : undefined

  return {
    id: wr.id,
    type: wr.type,
    createdAt: wr.createdAt.toStandardDate(),
    postToGithub: wr.postToGithub ?? false,
    state: wr.state ?? "pending",
    actor,
    repository,
    issue,
    commit,
  }
}
