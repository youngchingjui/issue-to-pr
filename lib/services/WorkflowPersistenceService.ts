import { Node, Record as Neo4jRecord } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"
import { PlanProperties } from "@/lib/types/plan"
import {
  WorkflowEvent,
  WorkflowEventType,
  WorkflowMetadata,
  WorkflowWithEvents,
} from "@/lib/types/workflow"

interface PlanResponse extends PlanProperties {
  message: {
    id: string
    type: "llm_response"
    timestamp: string
    data: {
      content: string
      model: string
    }
  }
  workflow?: {
    id: string
    metadata: WorkflowMetadata
  }
  issue?: {
    number: number
    repoFullName: string
  }
}

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
        MERGE (w:WorkflowRun {id: $workflowId})
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
        MATCH (i:Issue {repoFullName: $repoFullName, number: $issueNumber})<-[:BASED_ON_ISSUE]-(w:WorkflowRun)
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
        MERGE (w:WorkflowRun {id: $workflowId})
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
        MATCH (w:WorkflowRun {id: $workflowId})
        OPTIONAL MATCH (w)-[:BELONGS_TO_WORKFLOW]->(e:Event)
        OPTIONAL MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue)
        OPTIONAL MATCH (e)<-[:GENERATED_FROM]-(p:Plan)
        WITH w, collect({
          event: e,
          plan: CASE WHEN p IS NOT NULL THEN p ELSE NULL END
        }) as eventData, i
        RETURN 
          w.metadata as metadata,
          eventData,
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
      const eventData = record.get("eventData") as {
        event: Node
        plan: Node | null
      }[]
      const metadata = record.get("metadata")
      const issue = record.get("issue")

      const workflowEvents: WorkflowEvent[] = eventData
        .filter((e) => e.event !== null)
        .map((e) => {
          const eventProperties = e.event.properties
          const eventData = JSON.parse(eventProperties.data as string)

          // If this is an LLM response and has a plan, include the plan data
          if (eventProperties.type === "llm_response" && e.plan) {
            eventData.plan = {
              id: e.plan.properties.id,
              status: e.plan.properties.status,
              type: e.plan.properties.type,
              createdAt: new Date(e.plan.properties.createdAt),
            }
          }

          return {
            id: eventProperties.id as string,
            type: eventProperties.type as WorkflowEventType,
            workflowId,
            data: eventData,
            timestamp: new Date(eventProperties.timestamp as string),
          }
        })
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
        MATCH (w:WorkflowRun {id: $workflowId})
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

  async getPlanForIssue(
    issueNumber: number,
    repoFullName: string
  ): Promise<PlanResponse | null> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (i:Issue {number: $issueNumber, repoFullName: $repoFullName})-[:HAS_PLAN]->(p:Plan)
        MATCH (p)-[:GENERATED_FROM]->(e:Event)
        RETURN p, e
        ORDER BY p.createdAt DESC
        LIMIT 1
        `,
        { issueNumber, repoFullName }
      )

      if (result.records.length === 0) {
        return null
      }

      const plan = result.records[0].get("p")
      const event = result.records[0].get("e")

      return {
        id: plan.properties.id,
        status: plan.properties.status,
        type: plan.properties.type,
        createdAt: new Date(plan.properties.createdAt),
        message: {
          id: event.properties.id,
          type: "llm_response",
          timestamp: event.properties.timestamp,
          data: JSON.parse(event.properties.data),
        },
      }
    } finally {
      await session.close()
    }
  }

  async getPlanById(planId: string): Promise<PlanResponse | null> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (p:Plan {id: $planId})
        OPTIONAL MATCH (e:Event)<-[:GENERATED_FROM]-(p)
        OPTIONAL MATCH (w:WorkflowRun)<-[:PART_OF]->(p)
        OPTIONAL MATCH (p)<-[:HAS_PLAN]-(i:Issue)
        RETURN p, e, w, i
        `,
        { planId }
      )

      if (result.records.length === 0) {
        return null
      }

      const plan = result.records[0].get("p")
      const event = result.records[0].get("e")
      const workflow = result.records[0].get("w")
      const issue = result.records[0].get("i")

      return {
        id: plan.properties.id,
        status: plan.properties.status,
        type: plan.properties.type,
        createdAt: new Date(plan.properties.createdAt),
        message: {
          id: event.properties.id,
          type: "llm_response",
          timestamp: event.properties.timestamp,
          data: JSON.parse(event.properties.data),
        },
        workflow: workflow
          ? {
              id: workflow.properties.id,
              metadata: JSON.parse(workflow.properties.metadata || "{}"),
            }
          : undefined,
        issue: issue
          ? {
              number: issue.properties.number,
              repoFullName: issue.properties.repoFullName,
            }
          : undefined,
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

  async deleteEvent(eventId: string) {
    const session = await this.neo4j.getSession()
    try {
      // Find the previous and next events, delete the current event,
      // and create a new relationship between previous and next if they exist
      await session.run(
        `
        MATCH (e:Event {id: $eventId})
        OPTIONAL MATCH (prev:Event)-[r1:NEXT_EVENT]->(e)
        OPTIONAL MATCH (e)-[r2:NEXT_EVENT]->(next:Event)
        WITH e, prev, next, r1, r2
        DELETE r1, r2, e
        WITH prev, next
        FOREACH (x IN CASE WHEN prev IS NOT NULL AND next IS NOT NULL THEN [1] ELSE [] END |
          CREATE (prev)-[:NEXT_EVENT]->(next)
        )
        `,
        { eventId }
      )
    } finally {
      await session.close()
    }
  }

  async completeWorkflowRun(workflowId: string, result?: string) {
    const session = await this.neo4j.getSession()
    try {
      await session.run(
        `
        MATCH (w:WorkflowRun {id: $workflowId})
        SET w.status = 'completed',
            w.completedAt = datetime(),
            w.result = $result
        RETURN w
        `,
        {
          workflowId,
          result,
        }
      )
    } finally {
      await session.close()
    }
  }

  async failWorkflowRun(workflowId: string, error: string) {
    const session = await this.neo4j.getSession()
    try {
      await session.run(
        `
        MATCH (w:WorkflowRun {id: $workflowId})
        SET w.status = 'failed',
            w.completedAt = datetime(),
            w.result = $error
        RETURN w
        `,
        {
          workflowId,
          error,
        }
      )
    } finally {
      await session.close()
    }
  }
}
