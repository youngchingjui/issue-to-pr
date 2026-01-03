import { QueryResult } from "neo4j-driver"

import {
  commitSchema,
  issueSchema,
  repositorySchema,
  userSchema,
  workflowRunSchema,
  workflowRunStateSchema,
} from "@/shared/adapters/neo4j/types"
import { WorkflowRun } from "@/shared/entities/WorkflowRun"

import { ListByUserResult } from "./listByUser"

// Maps types from Neo4j to the domain types
export function mapListByUser(
  result: QueryResult<ListByUserResult>
): WorkflowRun[] {
  const results = result.records.map((record) => {
    // Get nodes

    const w = record.get("w")
    const userNode = record.get("u")
    const issueNode = record.get("i")
    const repoNode = record.get("r")
    const commitNode = record.get("c")
    const stateNode = record.get("state")

    // Parse schemas
    const run = workflowRunSchema.parse(w?.properties)
    const user = userSchema.parse(userNode?.properties)
    const issue = issueNode
      ? issueSchema.parse(issueNode.properties)
      : undefined
    const repo = repoNode
      ? repositorySchema.parse(repoNode.properties)
      : undefined
    const commit = commitNode
      ? commitSchema.parse(commitNode.properties)
      : undefined
    const state = workflowRunStateSchema.parse(stateNode)

    // Map actor from User relationship (this query only returns user-initiated runs)
    if (!user) {
      throw new Error(
        `Expected user node for workflow run ${run.id}, but got null`
      )
    }
    const actor: WorkflowRun["actor"] = {
      type: "user",
      userId: user.id,
    }

    const workflowRun: WorkflowRun = {
      id: run.id,
      type: run.type,
      createdAt: run.createdAt.toStandardDate(),
      postToGithub: run.postToGithub ?? false,
      state: state,
      issue: issue
        ? { repoFullName: issue.repoFullName, number: issue.number.toNumber() }
        : undefined,
      repository: repo ? { fullName: repo.fullName } : undefined,
      actor,
      commit: commit
        ? {
            sha: commit.sha,
            message: commit.message,
            repository: {
              fullName: repo?.fullName ?? issue?.repoFullName ?? "unknown",
            },
          }
        : undefined,
    }

    return workflowRun
  })

  return results
}
