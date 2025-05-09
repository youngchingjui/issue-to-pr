import { n4j } from "@/lib/neo4j/client"
import { toAppIssue } from "@/lib/neo4j/repositories/issue"
import * as runs from "@/lib/neo4j/repositories/workflowRun"
import { toAppWorkflowRun } from "@/lib/neo4j/repositories/workflowRun"
import {
  Issue as AppIssue,
  WorkflowRun as AppWorkflowRun,
  WorkflowType,
} from "@/lib/types"
import { int } from "neo4j-driver"

/**
 * Merges (matches or creates) a WorkflowRun node and the corresponding Issue node in the database, linking the two.
 *
 * If a WorkflowRun or Issue node does not exist, it will be created. If they are matched on the following properties, then they will be used:
 * - id (workflowRun)
 * - repoFullName (issue)
 * - issueNumber (issue)
 *
 * The function then links the WorkflowRun to the Issue with the following pattern:
 * (w:WorkflowRun)-[:BASED_ON_ISSUE]->(i:Issue)
 * and returns the application representations of both.
 */
export async function initializeWorkflowRun({
  id,
  type,
  issueNumber,
  repoFullName,
  postToGithub,
}: {
  id: string
  type: WorkflowType
  issueNumber: number
  repoFullName: string
  postToGithub?: boolean
}): Promise<{ issue: AppIssue; run: AppWorkflowRun }> {
  const session = await n4j.getSession()
  try {
    return await session.executeWrite(async (tx) => {
      const { run, issue } = await runs.mergeIssueLink(tx, {
        workflowRun: {
          id,
          type,
          postToGithub,
        },
        issue: {
          repoFullName,
          number: int(issueNumber),
        },
      })

      return {
        issue: toAppIssue(issue),
        run: toAppWorkflowRun(run),
      }
    })
  } finally {
    await session.close()
  }
}
