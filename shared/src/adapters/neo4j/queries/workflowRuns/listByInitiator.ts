import type { WorkflowRun } from "@shared/ports/db"
import type { Session } from "neo4j-driver"

import { mapListByInitiator } from "./listByInitiator.mapper"

export async function listWorkflowRunsByInitiator(
  session: Session,
  userId: string
): Promise<WorkflowRun[]> {
  const res = await session.run(
    `MATCH (u:User { id: $userId })<-[:INITIATED_BY]-(wr:WorkflowRun)
     OPTIONAL MATCH (wr)-[:TARGETS]->(repo:Repository)
     RETURN wr, repo.fullName AS repoFullName
     ORDER BY wr.createdAt DESC`,
    { userId }
  )
  return mapListByInitiator(res.records)
}
