import { QueryResult } from "neo4j-driver"

import {
  githubUserSchema,
  issueSchema,
  userSchema,
  workflowRunSchema,
  workflowRunStateSchema,
} from "@/shared/adapters/neo4j/types"
import { ListedWorkflowRun } from "@/shared/ports/db"

import { ListByInitiatorResult } from "./listByInitiator"

// Maps types from Neo4j to the domain types
export function mapListByInitiatorResult(
  result: QueryResult<ListByInitiatorResult>
): ListedWorkflowRun[] {
  const results = result.records.map((record) => {
    const run = workflowRunSchema.parse(record.get("w").properties)
    const userNode = record.get("u")
    const user = userNode ? userSchema.parse(userNode.properties) : null
    const githubUserNode = record.get("gh")
    const githubUser = githubUserNode
      ? githubUserSchema.parse(githubUserNode.properties)
      : null
    const issueNode = record.get("i")
    const issue = issueNode ? issueSchema.parse(issueNode.properties) : null
    const repoNode = record.get("r")
    const repo = repoNode ? repoNode.properties : null
    const state = workflowRunStateSchema.safeParse(record.get("state"))

    // Map actor from User relationship (this query only returns user-initiated runs)
    const actor: ListedWorkflowRun["actor"] = {
      kind: "user",
      userId: user!.id, // user is guaranteed to exist from MATCH query
      github: githubUser
        ? {
            id: githubUser.id,
            login: githubUser.login,
          }
        : undefined,
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
