import type { WorkflowEvent } from "@shared/ports/db"
import type { Session } from "neo4j-driver"

import { mapListEvents } from "./listEvents.mapper"

export async function listWorkflowRunEvents(
  session: Session,
  runId: string
): Promise<WorkflowEvent[]> {
  const res = await session.run(
    `MATCH (wr:WorkflowRun { id: $runId })-[:HAS_EVENT]->(e:Event)
     RETURN e
     ORDER BY e.createdAt ASC`,
    { runId }
  )
  return mapListEvents(res.records)
}
