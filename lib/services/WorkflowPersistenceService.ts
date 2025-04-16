import { Node, Record as Neo4jRecord } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"
import {
  WorkflowEvent,
  WorkflowEventType,
  WorkflowMetadata,
  WorkflowWithEvents,
} from "@/lib/types/workflow"

export class WorkflowPersistenceService {
  private neo4j: Neo4jClient

  constructor() {
    this.neo4j = Neo4jClient.getInstance()
  }

  async initializeWorkflow(
    workflowId: string,
    metadata: WorkflowMetadata,
    issue?: { number: number; repoFullName: string }
  ) {
    const session = await this.neo4j.getSession()
    try {
      // Create workflow and optionally connect to issue if metadata contains issue info
      await session.run(
        `
        MERGE (w:Workflow {id: $workflowId})
        SET w.created_at = datetime(),
            w.metadata = $metadata
        WITH w
        // If issue metadata exists, create/merge Issue node and connect it
        FOREACH (x IN CASE WHEN $hasIssue THEN [1] ELSE [] END |
          MERGE (i:Issue {number: $issueNumber, repoFullName: $repoFullName})
          MERGE (w)-[:BASED_ON_ISSUE]->(i)
        )
        RETURN w
        `,
        {
          workflowId,
          metadata: JSON.stringify(metadata),
          hasIssue: !!issue,
          issueNumber: issue?.number,
          repoFullName: issue?.repoFullName,
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

  static async getWorkflowsByIssue(
    repoFullName: string,
    issueNumber: number
  ): Promise<WorkflowWithEvents[]> {
    const client = Neo4jClient.getInstance()
    const session = await client.getSession()
    try {
      // Use relationship-based query to find workflows connected to the issue
      const result = await session.run(
        `
        MATCH (i:Issue {repoFullName: $repoFullName, number: $issueNumber})<-[:BASED_ON_ISSUE]-(w:Workflow)
        OPTIONAL MATCH (w)-[:BELONGS_TO_WORKFLOW]->(e:Event)
        WITH w, collect(e) as events, i
        RETURN w.id as id, w.metadata as metadata, events,
               { number: i.number, repoFullName: i.repoFullName } as issue
        ORDER BY w.created_at DESC
        `,
        {
          repoFullName,
          issueNumber,
        }
      )

      return await Promise.all(
        result.records.map(async (record: Neo4jRecord) => {
          const workflowId = record.get("id")
          const events = record.get("events") as Node[]
          const metadata = record.get("metadata")
          const issue = record.get("issue")

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
            issue,
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

  async getWorkflowEvents(
    workflowId: string
  ): Promise<WorkflowWithEvents | null> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (w:Workflow {id: $workflowId})
        OPTIONAL MATCH (w)-[:BELONGS_TO_WORKFLOW]->(e:Event)
        OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
        WITH w, collect(e) as events, i
        RETURN 
          w.metadata as metadata,
          events,
          CASE WHEN i IS NOT NULL 
            THEN { number: i.number, repoFullName: i.repoFullName }
            ELSE NULL 
          END as issue
        ORDER BY w.created_at DESC
        `,
        { workflowId }
      )

      if (result.records.length === 0) {
        return null
      }

      const record = result.records[0]
      const events = record.get("events") as Node[]
      const metadata = record.get("metadata")
      const issue = record.get("issue")

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
        issue: issue as { number: number; repoFullName: string } | undefined,
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

  async createPlan(params: {
    workflowId: string
    messageId: string
    issueNumber: number
    repoFullName: string
  }) {
    const session = await this.neo4j.getSession()
    try {
      // Create the Plan node and establish relationships
      const result = await session.run(
        `
        // Match the workflow and message
        MATCH (w:Workflow {id: $workflowId})
        MATCH (m:Event {id: $messageId})
        WHERE m.type = "llm_response"
        
        // Create Plan node
        CREATE (p:Plan {
          id: $planId,
          status: "draft",
          type: "issue_resolution",
          createdAt: datetime()
        })
        
        // Create relationships
        CREATE (p)-[:GENERATED_FROM]->(m)
        CREATE (p)-[:PART_OF]->(w)
        
        // Create relationship to Issue (creating Issue node if it doesn't exist)
        MERGE (i:Issue {number: $issueNumber, repoFullName: $repoFullName})
        CREATE (i)-[:HAS_PLAN]->(p)
        
        RETURN p
        `,
        {
          planId: uuidv4(),
          workflowId: params.workflowId,
          messageId: params.messageId,
          issueNumber: params.issueNumber,
          repoFullName: params.repoFullName,
        }
      )

      return result.records[0]?.get("p")?.properties
    } finally {
      await session.close()
    }
  }

  async getPlanForIssue(issueNumber: number, repoFullName: string) {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (i:Issue {number: $issueNumber, repoFullName: $repoFullName})-[:HAS_PLAN]->(p:Plan)
        MATCH (p)-[:GENERATED_FROM]->(m:Event)
        RETURN p, m
        ORDER BY p.createdAt DESC
        LIMIT 1
        `,
        {
          issueNumber,
          repoFullName,
        }
      )

      if (result.records.length === 0) {
        return null
      }

      const plan = result.records[0].get("p").properties
      const message = result.records[0].get("m").properties

      return {
        ...plan,
        message: {
          ...message,
          data: JSON.parse(message.data),
        },
      }
    } finally {
      await session.close()
    }
  }

  async updatePlanStatus(
    planId: string,
    status: "draft" | "approved" | "implemented"
  ) {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (p:Plan {id: $planId})
        SET p.status = $status
        RETURN p
        `,
        {
          planId,
          status,
        }
      )

      return result.records[0]?.get("p")?.properties
    } finally {
      await session.close()
    }
  }
}
