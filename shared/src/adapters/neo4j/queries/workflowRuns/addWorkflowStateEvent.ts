import { DateTime, Integer, ManagedTransaction, type QueryResult } from "neo4j-driver"

const QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // Find the last event (if any)
  OPTIONAL MATCH (wr)-[:STARTS_WITH|NEXT*]->(lastEvent:Event)
  WHERE NOT (lastEvent)-[:NEXT]->()

  // Create new workflowState event node
  CREATE (newEvent:Event {
    id: $eventId,
    type: 'workflowState',
    createdAt: datetime($createdAt),
    state: $state,
    content: $content
  })

  // Link to workflow run or previous event
  FOREACH (_ IN CASE WHEN lastEvent IS NULL THEN [1] ELSE [] END |
    MERGE (wr)-[:STARTS_WITH]->(newEvent)
  )
  FOREACH (_ IN CASE WHEN lastEvent IS NOT NULL THEN [1] ELSE [] END |
    MERGE (lastEvent)-[:NEXT]->(newEvent)
  )

  RETURN newEvent.id AS eventId, newEvent.type AS eventType, newEvent.createdAt AS createdAt, newEvent.state AS state, newEvent.content AS content
`

export interface AddWorkflowStateEventParams {
  runId: string
  eventId: string
  state: "pending" | "running" | "completed" | "error" | "timedOut"
  createdAt: string
  content?: string
}

export interface AddWorkflowStateEventResult {
  eventId: string
  eventType: "workflowState"
  createdAt: DateTime<Integer>
  state: "pending" | "running" | "completed" | "error" | "timedOut"
  content?: string | null
}

export async function addWorkflowStateEvent(
  tx: ManagedTransaction,
  params: AddWorkflowStateEventParams
): Promise<QueryResult<AddWorkflowStateEventResult>> {
  return await tx.run<AddWorkflowStateEventResult>(QUERY, params)
}

