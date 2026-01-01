import type { WorkflowRun } from "@shared/ports/db"
import type { Session } from "neo4j-driver"

import { mapListForRepo } from "./listForRepo.mapper"

export async function listWorkflowRunsForRepo(
  session: Session,
  repoFullName: string
): Promise<WorkflowRun[]> {
  const res = await session.run(
    `MATCH (repo:Repository { fullName: $repoFullName })<-[:TARGETS]-(wr:WorkflowRun)
     RETURN wr, repo.fullName AS repoFullName
     ORDER BY wr.createdAt DESC`,
    { repoFullName }
  )
  return mapListForRepo(res.records)
}
