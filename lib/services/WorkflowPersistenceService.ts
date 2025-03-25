import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"

export type WorkflowEventType =
  | "workflow_start"
  | "llm_response"
  | "tool_call"
  | "tool_response"
  | "error"
  | "complete"

export interface WorkflowEvent {
  id: string
  type: WorkflowEventType
  workflowId: string
  data: Record<string, unknown>
  timestamp: Date
  metadata?: Record<string, unknown>
}

export class WorkflowPersistenceService {
  private neo4j: Neo4jClient

  constructor() {
    this.neo4j = Neo4jClient.getInstance()
  }

  async saveEvent(event: Omit<WorkflowEvent, "id">) {
    const session = await this.neo4j.getSession()
    try {
      // First ensure workflow node exists
      await session.run(
        `
        MERGE (w:Workflow {id: $workflowId})
        ON CREATE SET w.created_at = datetime()
        RETURN w
        `,
        { workflowId: event.workflowId }
      )

      // Then create event node with relationships
      const result = await session.run(
        `
        MATCH (w:Workflow {id: $workflowId})
        CREATE (e:Event {
          id: $eventId,
          type: $type,
          data: $data,
          metadata: $metadata,
          timestamp: datetime($timestamp)
        })
        CREATE (w)-[:BELONGS_TO_WORKFLOW]->(e)
        WITH e, w
        MATCH (w)-[:BELONGS_TO_WORKFLOW]->(prev:Event)
        WHERE prev.timestamp < e.timestamp
        WITH e, prev
        ORDER BY prev.timestamp DESC
        LIMIT 1
        CREATE (prev)-[:NEXT_EVENT]->(e)
        RETURN e
        `,
        {
          eventId: uuidv4(),
          workflowId: event.workflowId,
          type: event.type,
          data: JSON.stringify(event.data),
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          timestamp: event.timestamp.toISOString(),
        }
      )

      return result.records[0]?.get("e")?.properties?.id
    } finally {
      await session.close()
    }
  }

  async getWorkflowEvents(workflowId: string): Promise<WorkflowEvent[]> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (w:Workflow {id: $workflowId})-[:BELONGS_TO_WORKFLOW]->(e:Event)
        RETURN e
        ORDER BY e.timestamp
        `,
        { workflowId }
      )

      return result.records.map((record) => {
        const event = record.get("e").properties
        return {
          id: event.id,
          type: event.type as WorkflowEventType,
          workflowId,
          data: JSON.parse(event.data),
          metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
          timestamp: new Date(event.timestamp),
        }
      })
    } finally {
      await session.close()
    }
  }

  async getWorkflowState(workflowId: string): Promise<{
    status: "active" | "completed" | "error"
    lastEventTimestamp: Date | null
  }> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (w:Workflow {id: $workflowId})-[:BELONGS_TO_WORKFLOW]->(e:Event)
        WITH e
        ORDER BY e.timestamp DESC
        LIMIT 1
        RETURN e.type as lastEventType, e.timestamp as lastEventTimestamp
        `,
        { workflowId }
      )

      if (result.records.length === 0) {
        return { status: "active", lastEventTimestamp: null }
      }

      const lastEvent = result.records[0]
      const lastEventType = lastEvent.get("lastEventType")
      const lastEventTimestamp = new Date(lastEvent.get("lastEventTimestamp"))

      let status: "active" | "completed" | "error" = "active"
      if (lastEventType === "complete") {
        status = "completed"
      } else if (lastEventType === "error") {
        status = "error"
      }

      return { status, lastEventTimestamp }
    } finally {
      await session.close()
    }
  }
}
