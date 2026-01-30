import { Node, type QueryResult } from "neo4j-driver"

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
import {
  type WorkflowRun,
  type WorkflowRunActor,
} from "@/shared/entities/WorkflowRun"

import { type ListForRepoResult } from "./listForRepo"

// ============================================================================
// Actor Mapping Helpers
// These functions compose validated Neo4j nodes into domain actor types
// ============================================================================

/**
 * Maps actor nodes to a WorkflowRunActor domain type
 * Handles two patterns:
 * - User-initiated: userActor node present
 * - Webhook-triggered: webhookEvent and webhookSender nodes present
 */
function mapActor(
  userActorNode: Node | null,
  webhookEventNode: Node | null,
  webhookSenderNode: Node | null,
  installationId: string
): WorkflowRunActor | undefined {
  // Webhook-triggered workflow
  if (webhookEventNode && webhookSenderNode) {
    const webhookEvent = githubWebhookEventSchema.parse(
      webhookEventNode.properties
    )
    const sender = githubUserSchema.parse(webhookSenderNode.properties)

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

  // User-initiated workflow
  if (userActorNode) {
    const user = userSchema.parse(userActorNode.properties)
    return {
      type: "user",
      userId: user.id,
    }
  }

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
    const userActorNode = record.get("userActor")
    const webhookEventNode = record.get("webhookEvent")
    const webhookSenderNode = record.get("webhookSender")
    const stateNode = record.get("state")
    const i = record.get("i")
    const r = record.get("r")
    const c = record.get("c")

    // Validate all nodes with Zod
    const run = workflowRunSchema.parse(w.properties)
    const issue = i ? issueSchema.parse(i.properties) : null
    const repo = repositorySchema.parse(r.properties)
    const commit = c ? commitSchema.parse(c.properties) : null
    const state = workflowRunStateSchema.safeParse(stateNode)

    // Map actor using helper function with Zod validation
    const actor = mapActor(
      userActorNode,
      webhookEventNode,
      webhookSenderNode,
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
