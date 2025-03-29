import { Node, Record as Neo4jRecord } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"
import {
  WorkflowEvent as BaseWorkflowEvent,
  WorkflowEventData,
  WorkflowEventType,
} from "@/lib/types/workflow"

export interface WorkflowEvent extends BaseWorkflowEvent {
  id: string
  metadata?: Record<string, unknown>
}

export interface WorkflowWithEvents {
  id: string
  events: WorkflowEvent[]
  status: "active" | "completed" | "error"
  lastEventTimestamp: Date | null
}

export class WorkflowPersistenceService {
  private neo4j: Neo4jClient

  constructor() {
    this.neo4j = Neo4jClient.getInstance()
  }

  static async getWorkflows(): Promise<WorkflowWithEvents[]> {
    const client = Neo4jClient.getInstance()
    const session = await client.getSession()
    try {
      const result = await session.run(
        `
        MATCH (w:Workflow)
        OPTIONAL MATCH (w)-[:BELONGS_TO_WORKFLOW]->(e:Event)
        WITH w, collect(e) as events
        RETURN w.id as id, events
        ORDER BY w.created_at DESC
        `
      )

      return await Promise.all(
        result.records.map(async (record: Neo4jRecord) => {
          const workflowId = record.get("id")
          const events = record.get("events") as Node[]

          // Convert Neo4j events to WorkflowEvent[]
          const workflowEvents: WorkflowEvent[] = events
            .filter((e) => e !== null)
            .map((e) => ({
              id: e.properties.id as string,
              type: e.properties.type as WorkflowEventType,
              workflowId,
              data: JSON.parse(
                e.properties.data as string
              ) as WorkflowEventData,
              metadata: e.properties.metadata
                ? JSON.parse(e.properties.metadata as string)
                : undefined,
              timestamp: new Date(e.properties.timestamp as string),
            }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

          // Determine workflow status and last event timestamp
          let status: "active" | "completed" | "error" = "active"
          let lastEventTimestamp: Date | null = null

          if (workflowEvents.length > 0) {
            const lastEvent = workflowEvents[workflowEvents.length - 1]
            lastEventTimestamp = lastEvent.timestamp

            if (lastEvent.type === "complete") {
              status = "completed"
            } else if (lastEvent.type === "error") {
              status = "error"
            }
          }

          return {
            id: workflowId,
            events: workflowEvents,
            status,
            lastEventTimestamp,
          }
        })
      )
    } finally {
      await session.close()
    }
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
          data: JSON.parse(event.data) as WorkflowEventData,
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
