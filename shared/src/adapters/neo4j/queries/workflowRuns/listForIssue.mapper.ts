import { QueryResult } from "neo4j-driver"

import {
  issueSchema,
  workflowRunSchema,
  workflowRunStateSchema,
} from "@/shared/adapters/neo4j/types"
import { ListedWorkflowRun } from "@/shared/ports/db"

import { ListForIssueResult } from "./listForIssue"

// Maps types from Neo4j to the domain types
export function mapListForIssueResult(
  result: QueryResult<ListForIssueResult>
): ListedWorkflowRun[] {
  const results = result.records.map((record) => {
    const run = workflowRunSchema.parse(record.get("w").properties)
    const issue = issueSchema.parse(record.get("i").properties)
    const state = workflowRunStateSchema.safeParse(record.get("state"))
    return {
      id: run.id,
      type: run.type,
      createdAt: run.createdAt.toISOString(),
      postToGithub: run.postToGithub,
      state: state.success ? state.data : "completed",
      issue: { repoFullName: issue.repoFullName, number: issue.number },
    }
  })

  return results
}
