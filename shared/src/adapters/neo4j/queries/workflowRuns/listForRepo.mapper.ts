import { Node, QueryResult } from "neo4j-driver"

import {
  commitSchema,
  githubUserSchema,
  githubWebhookEventSchema,
  issueSchema,
  repositorySchema,
  userSchema,
  workflowRunSchema,
  workflowRunStateSchema,
} from "@/shared/adapters/neo4j/types"
import { WorkflowRun, WorkflowRunActor } from "@/shared/entities/WorkflowRun"

import { ListForRepoResult } from "./listForRepo"

// ============================================================================
// Actor Mapping Helpers
// These functions compose validated Neo4j nodes into domain actor types
// ============================================================================

/**
 * Maps a validated User node to a UserActor domain type
 */
function mapUserActor(
  userNode: Node,
  _githubUserNode: Node | null // Available but not needed for UserActor
): WorkflowRunActor {
  const user = userSchema.parse(userNode.properties)

  return {
    type: "user",
    userId: user.id,
  }
}

/**
 * Maps validated GithubWebhookEvent and GithubUser nodes to a WebhookActor domain type
 */
function mapWebhookActor(
  webhookEventNode: Node,
  senderNode: Node | null,
  installationId: string
): WorkflowRunActor {
  const webhookEvent = githubWebhookEventSchema.parse(
    webhookEventNode.properties
  )
  const sender = senderNode
    ? githubUserSchema.parse(senderNode.properties)
    : null

  if (!sender) {
    throw new Error(
      `WebhookActor requires a sender, but got null for webhook event ${webhookEvent.id}`
    )
  }

  return {
    type: "webhook",
    source: "github",
    event: webhookEvent.event,
    action: webhookEvent.action,
    sender: {
      id: sender.id,
      login: sender.login,
    },
    installationId,
  }
}

/**
 * Maps the actor node based on its labels (User or GithubWebhookEvent)
 * Uses Zod to validate each node before composing into domain actor
 */
function mapActor(
  actorNode: Node | null,
  userGhNode: Node | null,
  webhookGhNode: Node | null,
  installationId: string
): WorkflowRunActor | undefined {
  if (!actorNode) {
    return undefined
  }

  const labels = Array.from(actorNode.labels || []) as string[]

  if (labels.includes("User")) {
    return mapUserActor(actorNode, userGhNode)
  } else if (labels.includes("GithubWebhookEvent")) {
    return mapWebhookActor(actorNode, webhookGhNode, installationId)
  }

  // Unknown actor type - log warning and return undefined
  console.warn(`Unknown actor type with labels: ${labels.join(", ")}`)
  return undefined
}

// ============================================================================
// Main Mapper
// ============================================================================

/**
 * Maps Neo4j query results to WorkflowRun domain entities
 * Uses Zod schemas to validate each node before mapping
 */
export function mapListForRepoResult(
  result: QueryResult<ListForRepoResult>
): WorkflowRun[] {
  return result.records.map((record) => {
    // Get the records
    const w = record.get("w")
    const actorNode = record.get("actor")
    const userGhNode = record.get("userGh")
    const webhookGhNode = record.get("webhookGh")
    const stateNode = record.get("state")
    const i = record.get("i")
    const r = record.get("r")
    const c = record.get("c")

    // Validate all nodes with Zod
    const run = workflowRunSchema.parse(w.properties)
    const issue = issueSchema.parse(i?.properties)
    const repo = repositorySchema.parse(r?.properties)
    const commit = c ? commitSchema.parse(c.properties) : null
    const state = workflowRunStateSchema.safeParse(stateNode)

    // Map actor using helper function with Zod validation
    const actor = mapActor(
      actorNode,
      userGhNode,
      webhookGhNode,
      repo?.githubInstallationId ?? ""
    )

    const workflowRun: WorkflowRun = {
      id: run.id,
      type: run.type,
      createdAt: run.createdAt.toStandardDate(),
      postToGithub: run.postToGithub ?? false,
      state: state.success ? state.data : "completed",
      issue: issue
        ? {
            repoFullName: issue.repoFullName,
            number: issue.number.toNumber(),
          }
        : undefined,
      repository: { fullName: repo.fullName },
      actor,
      commit: commit
        ? {
            sha: commit.sha,
            message: commit.message,
            repository: {
              fullName: repo.fullName,
            },
          }
        : undefined,
    }

    return workflowRun
  })
}
