import { int, Integer, ManagedTransaction, Node } from "neo4j-driver"

import { WorkflowRun as AppWorkflowRun } from "@/lib/types"
import { WorkflowRun, workflowRunSchema } from "@/lib/types/db/neo4j"
import { Issue, issueSchema } from "@/lib/types/db/neo4j"

export async function create(
  tx: ManagedTransaction,
  workflowRun: Omit<WorkflowRun, "createdAt">
): Promise<WorkflowRun> {
  const result = await tx.run<{ w: Node<Integer, WorkflowRun, "WorkflowRun"> }>(
    `
    CREATE (w:WorkflowRun {id: $id, type: $type, createdAt: datetime(), postToGithub: $postToGithub}) 
    RETURN w
    `,
    {
      id: workflowRun.id,
      type: workflowRun.type,
      postToGithub: workflowRun.postToGithub ?? null,
    }
  )
  return workflowRunSchema.parse(result.records[0].get("w").properties)
}

export async function get(
  tx: ManagedTransaction,
  id: string
): Promise<WorkflowRun | null> {
  const result = await tx.run<{ w: Node<Integer, WorkflowRun, "WorkflowRun"> }>(
    `MATCH (w:WorkflowRun {id: $id}) RETURN w LIMIT 1`,
    { id }
  )
  const raw = result.records[0]?.get("w")?.properties
  return raw ? workflowRunSchema.parse(raw) : null
}

export async function linkToIssue(
  tx: ManagedTransaction,
  {
    workflowId,
    issueId,
    repoFullName,
  }: { workflowId: string; issueId: number; repoFullName: string }
) {
  const result = await tx.run(
    `
    MATCH (w:WorkflowRun {id: $workflowId}), (i:Issue {number: $issueId, repoFullName: $repoFullName}) 
    CREATE (w)-[:BASED_ON_ISSUE]->(i)
    RETURN w, i
    `,
    { workflowId, issueId: int(issueId), repoFullName }
  )
  return result
}

export async function mergeIssueLink(
  tx: ManagedTransaction,
  {
    workflowRun,
    issue,
  }: {
    workflowRun: Omit<WorkflowRun, "createdAt">
    issue: Issue
  }
): Promise<{ run: WorkflowRun; issue: Issue }> {
  const result = await tx.run(
    `
    MERGE (w:WorkflowRun {id: $workflowRun.id})
      ON CREATE SET w.type = $workflowRun.type, w.createdAt = datetime(), w.postToGithub = $workflowRun.postToGithub
    MERGE (i:Issue {repoFullName: $issue.repoFullName, number: $issue.number})
    MERGE (w)-[:BASED_ON_ISSUE]->(i)
    RETURN w, i
    `,
    {
      workflowRun,
      issue,
    }
  )
  const run = workflowRunSchema.parse(result.records[0].get("w").properties)
  const parsedIssue = issueSchema.parse(result.records[0].get("i").properties)
  return { run, issue: parsedIssue }
}

export const toAppWorkflowRun = (dbRun: WorkflowRun): AppWorkflowRun => {
  // NOTE: Currently there's no transformation needed.
  // This function is placeholder for future transformations.
  return {
    ...dbRun,
    createdAt: dbRun.createdAt.toStandardDate(),
  }
}
