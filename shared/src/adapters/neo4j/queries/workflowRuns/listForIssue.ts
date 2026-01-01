import type { WorkflowRun } from "@shared/ports/db"
import type { Session } from "neo4j-driver"

import { mapListForIssue } from "./listForIssue.mapper"

export async function listWorkflowRunsForIssue(
  session: Session,
  repoFullName: string,
  issueNumber: number
): Promise<WorkflowRun[]> {
  const res = await session.run(
    `MATCH (i:Issue { repoFullName: $repoFullName, number: $issueNumber })<-[:BASED_ON_ISSUE]-(wr:WorkflowRun)
     OPTIONAL MATCH (wr)-[:TARGETS]->(repo:Repository)
     RETURN wr, repo.fullName AS repoFullName
     ORDER BY wr.createdAt DESC`,
    { repoFullName, issueNumber }
  )
  return mapListForIssue(res.records)
}
