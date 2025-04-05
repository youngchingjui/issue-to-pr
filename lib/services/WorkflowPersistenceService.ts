import { Node, Record as Neo4jRecord } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"
import { WorkflowEvent, WorkflowEventType } from "@/lib/types/workflow"

export interface WorkflowWithEvents {
  id: string
  events: WorkflowEvent[]
  status: "active" | "completed" | "error"
  lastEventTimestamp: Date | null
  metadata?: Record<string, unknown>
}

// Add a new type for workflow metadata
export interface WorkflowMetadata {
  workflowType: string
  issue?: {
    number: number
    /** Full repository name in the format 'owner/repo' (e.g. 'octocat/Hello-World') */
    repoFullName: string
    title?: string
  }
  postToGithub: boolean
}

export class WorkflowPersistenceService {
  private neo4j: Neo4jClient

  constructor() {
    this.neo4j = Neo4jClient.getInstance()
  }

  async initializeWorkflow(workflowId: string, metadata: WorkflowMetadata) {
    const session = await this.neo4j.getSession()
    try {
      await session.run(
        `
        MERGE (w:Workflow {id: $workflowId})
        SET w.created_at = datetime(),
            w.metadata = $metadata
        RETURN w
        `,
        {
          workflowId,
          metadata: JSON.stringify(metadata),
        }
      )
    } finally {
      await session.close()
    }
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
        RETURN w.id as id, w.metadata as metadata, events
        ORDER BY w.created_at DESC
        `
      )

      return await Promise.all(
        result.records.map(async (record: Neo4jRecord) => {
          const workflowId = record.get("id")
          const events = record.get("events") as Node[]
          const metadata = record.get("metadata")

          // Convert Neo4j events to WorkflowEvent[]
          const workflowEvents: WorkflowEvent[] = events
            .filter((e) => e !== null)
            .map((e) => ({
              id: e.properties.id as string,
              type: e.properties.type as WorkflowEventType,
              workflowId,
              data: JSON.parse(e.properties.data as string),
              timestamp: new Date(e.properties.timestamp as string),
            }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

          // Determine workflow status and last event timestamp
          let status: "active" | "completed" | "error" = "active"
          let lastEventTimestamp: Date | null = null

          if (workflowEvents.length > 0) {
            const lastEvent = workflowEvents[workflowEvents.length - 1]
            lastEventTimestamp = lastEvent.timestamp

            if (
              lastEvent.type === "status" &&
              lastEvent.data.status === "completed"
            ) {
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
            metadata: metadata ? JSON.parse(metadata as string) : undefined,
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
      // Only handle event creation and linking, no workflow metadata management
      const result = await session.run(
        `
        MERGE (w:Workflow {id: $workflowId})
        CREATE (e:Event {
          id: $eventId,
          type: $type,
          data: $data,
          timestamp: datetime($timestamp)
        })
        CREATE (w)-[:BELONGS_TO_WORKFLOW]->(e)
        WITH e, w
        OPTIONAL MATCH (w)-[:BELONGS_TO_WORKFLOW]->(prev:Event)
        WHERE prev.timestamp < e.timestamp
        WITH e, prev
        ORDER BY prev.timestamp DESC
        LIMIT 1
        FOREACH(x IN CASE WHEN prev IS NOT NULL THEN [1] ELSE [] END |
          CREATE (prev)-[:NEXT_EVENT]->(e)
        )
        RETURN e
        `,
        {
          eventId: uuidv4(),
          workflowId: event.workflowId,
          type: event.type,
          data: JSON.stringify(event.data),
          timestamp: event.timestamp.toISOString(),
        }
      )

      return result.records[0]?.get("e")?.properties?.id
    } finally {
      await session.close()
    }
  }

  async getWorkflowEvents(workflowId: string): Promise<{
    events: WorkflowEvent[]
    metadata?: WorkflowMetadata
  }> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (w:Workflow {id: $workflowId})
        OPTIONAL MATCH (w)-[:BELONGS_TO_WORKFLOW]->(e:Event)
        WITH w, collect(e) as events
        RETURN w.metadata as metadata, events
        ORDER BY w.created_at DESC
        `,
        { workflowId }
      )

      if (result.records.length === 0) {
        return { events: [], metadata: undefined }
      }

      const record = result.records[0]
      const events = record.get("events") as Node[]
      const metadata = record.get("metadata")

      const workflowEvents: WorkflowEvent[] = events
        .filter((e) => e !== null)
        .map((e) => ({
          id: e.properties.id as string,
          type: e.properties.type as WorkflowEventType,
          workflowId,
          data: JSON.parse(e.properties.data as string),
          timestamp: new Date(e.properties.timestamp as string),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      return {
        events: workflowEvents,
        metadata: metadata ? JSON.parse(metadata as string) : undefined,
      }
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
      if (lastEventType === "status") {
        const eventData = JSON.parse(result.records[0].get("e").properties.data)
        if (eventData.status === "completed") {
          status = "completed"
        }
      } else if (lastEventType === "error") {
        status = "error"
      }

      return { status, lastEventTimestamp }
    } finally {
      await session.close()
    }
  }
}
