import {
  DateTime,
  Integer,
  type ManagedTransaction,
  type QueryResult,
} from "neo4j-driver"

const QUERY = `
  // Find the WorkflowRun
  MATCH (wr:WorkflowRun { id: $runId })

  // Optionally find the explicit parent event when provided
  OPTIONAL MATCH (parentEvent:Event { id: $parentEventId })

  // Find the last event (if any) when no parentEventId is provided
  WITH wr, parentEvent
  OPTIONAL MATCH (wr)-[:STARTS_WITH|NEXT*]->(lastEvent:Event)
  WHERE parentEvent IS NULL AND NOT (lastEvent)-[:NEXT]->()

  // Create new event node
  CREATE (newEvent:Event {
    id: $eventId,
    type: $eventType,
    createdAt: datetime($createdAt),
    content: $content
  })

  // Link to workflow run or previous event
  // 1) If no events yet and no explicit parent provided -> STARTS_WITH
  FOREACH (_ IN CASE WHEN parentEvent IS NULL AND lastEvent IS NULL THEN [1] ELSE [] END |
    MERGE (wr)-[:STARTS_WITH]->(newEvent)
  )
  // 2) If explicit parent provided -> create branch from that parent using NEXT
  FOREACH (_ IN CASE WHEN parentEvent IS NOT NULL THEN [1] ELSE [] END |
    MERGE (parentEvent)-[:NEXT]->(newEvent)
  )
  // 3) Otherwise append to the tail using NEXT (sequential)
  FOREACH (_ IN CASE WHEN parentEvent IS NULL AND lastEvent IS NOT NULL THEN [1] ELSE [] END |
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
  parentEventId?: string | null
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

