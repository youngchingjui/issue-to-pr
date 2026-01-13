import { type QueryResult } from "neo4j-driver"

import {
  commitSchema,
  issueSchema,
  workflowRunSchema,
  workflowRunStateSchema,
} from "@/shared/adapters/neo4j/types"
import { type WorkflowRun } from "@/shared/entities/WorkflowRun"

import { type ListForIssueResult } from "./listForIssue"

// Maps types from Neo4j to the domain types
export function mapListForIssue(
  result: QueryResult<ListForIssueResult>
): WorkflowRun[] {
  const results = result.records.map((record) => {
    // Get nodes
    const w = record.get("w")
    const issueNode = record.get("i")
    const commitNode = record.get("c")
    const stateNode = record.get("state")

    // Parse schemas
    const run = workflowRunSchema.parse(w?.properties)
    const issue = issueSchema.parse(issueNode?.properties)
    const commit = commitNode ? commitSchema.parse(commitNode.properties) : null
    const state = workflowRunStateSchema.parse(stateNode)

    const workflowRun: WorkflowRun = {
      id: run.id,
      type: run.type,
      createdAt: run.createdAt.toStandardDate(),
      postToGithub: run.postToGithub ?? false,
      state: state,
      issue: {
        repoFullName: issue.repoFullName,
        number: issue.number.toNumber(),
      },
      // Actor is not queried in listForIssue - would need to update query to include it
      actor: undefined,
      commit: commit
        ? {
            sha: commit.sha,
            message: commit.message,
            repository: {
              fullName: issue.repoFullName,
            },
          }
        : undefined,
    }

    return workflowRun
  })

  return results
}
