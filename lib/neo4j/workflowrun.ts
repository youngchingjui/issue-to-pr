import { Integer, Node } from "neo4j-driver"

import { n4j } from "@/lib/neo4j/client"
import { WorkflowRun as appWorkflowRun, WorkflowType } from "@/lib/types"
import { WorkflowRun as n4jWorkflowRun } from "@/lib/types/db/neo4j"

export async function createWorkflowRun({
  id,
  type,
  postToGithub,
}: {
  id: string
  type: WorkflowType
  postToGithub?: boolean
}): Promise<appWorkflowRun> {
  const session = await n4j.getSession()
  const result = await session.run<{
    w: Node<Integer, n4jWorkflowRun, "WorkflowRun">
  }>(
    `
    CREATE (w:WorkflowRun {id: $id, type: $type, createdAt: datetime(), postToGithub: $postToGithub})
    RETURN w
    `,
    { id, type, postToGithub: postToGithub ?? null }
  )

  const workflow = result.records[0]?.get("w")?.properties
  return {
    ...workflow,
    createdAt: workflow?.createdAt.toStandardDate(),
  }
}
