import { QueryResult } from "neo4j-driver"

import {
  githubUserSchema,
  issueSchema,
  userSchema,
  workflowRunSchema,
  workflowRunStateSchema,
} from "@/shared/adapters/neo4j/types"
import { ListedWorkflowRun } from "@/shared/ports/db"

import { ListForRepoResult } from "./listForRepo"

// Maps types from Neo4j to the domain types
export function mapListForRepoResult(
  result: QueryResult<ListForRepoResult>
): ListedWorkflowRun[] {
  const results = result.records.map((record) => {
    const run = workflowRunSchema.parse(record.get("w").properties)
    const initiatorNode = record.get("initiator")
    const githubUserNode = record.get("gh")
    const webhookGhNode = record.get("webhookGh")
    const issueNode = record.get("i")
    const issue = issueNode ? issueSchema.parse(issueNode.properties) : null
    const repoNode = record.get("r")
    const repo = repoNode ? repoNode.properties : null
    const state = workflowRunStateSchema.safeParse(record.get("state"))

    // Map actor based on initiator type
    let actor: ListedWorkflowRun["actor"]

    if (initiatorNode) {
      const labels = Array.from(initiatorNode.labels || []) as string[]

      if (labels.includes("User")) {
        // User-initiated run
        const user = userSchema.parse(initiatorNode.properties)
        const githubUser = githubUserNode
          ? githubUserSchema.parse(githubUserNode.properties)
          : null

        actor = {
          kind: "user",
          userId: user.id,
          github: githubUser
            ? {
                id: githubUser.id,
                login: githubUser.login,
              }
            : undefined,
        }
      } else if (labels.includes("GithubWebhookEvent")) {
        // Webhook-initiated run
        const webhookGh = webhookGhNode
          ? githubUserSchema.parse(webhookGhNode.properties)
          : null

        // Note: installationId would need to be retrieved via UNDER_INSTALLATION relationship
        // For now, we don't include it in the listing (can be added if needed)
        actor = {
          kind: "webhook",
          source: "github",
          sender: webhookGh
            ? {
                id: webhookGh.id,
                login: webhookGh.login,
              }
            : undefined,
        }
      } else {
        // Unknown initiator type
        actor = { kind: "system", reason: "unknown initiator type" }
      }
    } else {
      // No initiator found
      actor = { kind: "system", reason: "no initiator" }
    }

    return {
      id: run.id,
      type: run.type,
      createdAt: run.createdAt.toISOString(),
      postToGithub: run.postToGithub,
      state: state.success ? state.data : "completed",
      issue: issue
        ? { repoFullName: issue.repoFullName, number: issue.number }
        : undefined,
      repository: repo ? { fullName: repo.fullName, id: repo.id } : undefined,
      actor,
    }
  })

  return results
}
