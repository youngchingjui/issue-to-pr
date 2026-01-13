import {
  DateTime,
  Integer,
  type ManagedTransaction,
  type QueryResult,
} from "neo4j-driver"

const QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // Find the last event (if any)
  OPTIONAL MATCH (wr)-[:STARTS_WITH|NEXT*]->(lastEvent:Event)
  WHERE NOT (lastEvent)-[:NEXT]->()

  // Create new event node
  CREATE (newEvent:Event {
    id: $eventId,
    type: $eventType,
    createdAt: datetime($createdAt),
    content: $content
  })

  // Link to workflow run or previous event
  FOREACH (_ IN CASE WHEN lastEvent IS NULL THEN [1] ELSE [] END |
    MERGE (wr)-[:STARTS_WITH]->(newEvent)
  )
  FOREACH (_ IN CASE WHEN lastEvent IS NOT NULL THEN [1] ELSE [] END |
    MERGE (lastEvent)-[:NEXT]->(newEvent)
  )

  RETURN newEvent.id AS eventId, newEvent.type AS eventType, newEvent.content AS content, newEvent.createdAt AS createdAt
`

export interface AddEventParams {
  runId: string
  eventId: string
  eventType: string
  content: string
  createdAt: string
}

export interface AddEventResult {
  eventId: string
  eventType: string
  content: string
  createdAt: DateTime<Integer>
}

export async function addEvent(
  tx: ManagedTransaction,
  params: AddEventParams
): Promise<QueryResult<AddEventResult>> {
  return await tx.run<AddEventResult>(QUERY, params)
}
