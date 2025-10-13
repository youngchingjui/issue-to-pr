import { Integer, ManagedTransaction, Node } from "neo4j-driver"
import { withTiming } from "shared/utils/telemetry"

import {
  Issue,
  issueSchema,
  WorkflowRun,
  workflowRunSchema,
  WorkflowRunState,
  workflowRunStateSchema,
} from "@/lib/types/db/neo4j"

/**
 * Returns the latest workflow state per workflow run for a set of issues.
 * Each row corresponds to a workflow run linked to an issue.
 */
export async function listLatestStatesForIssues(
  tx: ManagedTransaction,
  {
    repoFullName,
    issueNumbers,
  }: { repoFullName: string; issueNumbers: number[] }
): Promise<
  {
    issue: Issue
    run: WorkflowRun
    state: WorkflowRunState | null
  }[]
> {
  const result = await withTiming(
    `Neo4j QUERY: listLatestStatesForIssues ${repoFullName} [${issueNumbers.join(", ")} ]`,
    () =>
      tx.run<{
        i: Node<Integer, Issue, "Issue">
        w: Node<Integer, WorkflowRun, "WorkflowRun"> | null
        state: WorkflowRunState | null
      }>(
        `MATCH (i:Issue {repoFullName: $repoFullName})
         WHERE i.number IN $issueNumbers
         OPTIONAL MATCH (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i)
         OPTIONAL MATCH (w)-[:STARTS_WITH|NEXT*]->(e:Event {type: 'workflowState'})
         WITH i, w, e
         ORDER BY e.createdAt DESC
         WITH i, w, collect(e)[0] as latestWorkflowState
         RETURN i as i, w as w, latestWorkflowState.state as state`,
        { repoFullName, issueNumbers }
      )
  )

  return result.records
    .map((record) => {
      const i = issueSchema.parse(record.get("i").properties)
      const wNode = record.get("w")
      const w = wNode ? workflowRunSchema.parse(wNode.properties) : null
      const stateVal = record.get("state")
      const stateParsed = stateVal
        ? workflowRunStateSchema.safeParse(stateVal)
        : { success: false }
      return w
        ? {
            issue: i,
            run: w,
            state: stateParsed.success ? stateParsed.data : null,
          }
        : null
    })
    .filter(Boolean) as {
    issue: Issue
    run: WorkflowRun
    state: WorkflowRunState | null
  }[]
}

