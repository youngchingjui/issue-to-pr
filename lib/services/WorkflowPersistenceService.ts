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
}

export class WorkflowPersistenceService {
  private neo4j: Neo4jClient

  constructor() {
    this.neo4j = Neo4jClient.getInstance()
  }
/* ...existing code omitted for brevity... */

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

  /**
   * Get a plan (and its source message/event and optionally associated workflow/issue) by plan's ID
   * Returns null if not found.
   */
  async getPlanById(planId: string): Promise<(PlanResponse & { issue?: { number: number, repoFullName: string }, workflow?: { id: string, metadata?: any } }) | null> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (p:Plan {id: $planId})-[:GENERATED_FROM]->(m:Event)
        OPTIONAL MATCH (p)<-[:HAS_PLAN]-(i:Issue)
        OPTIONAL MATCH (p)-[:PART_OF]->(w:Workflow)
        RETURN p, m, i, w
        `,
        {
          planId
        }
      )
      if (result.records.length === 0) {
        return null
      }
      const plan = result.records[0].get("p").properties
      const message = result.records[0].get("m").properties
      const issueNode = result.records[0].get("i")
      const workflowNode = result.records[0].get("w")

      let issue: { number: number, repoFullName: string } | undefined = undefined
      let workflow: { id: string, metadata?: any } | undefined = undefined

      if (issueNode) {
        issue = {
          number: issueNode.properties.number,
          repoFullName: issueNode.properties.repoFullName,
        }
      }
      if (workflowNode) {
        workflow = {
          id: workflowNode.properties.id,
          metadata: workflowNode.properties.metadata ? JSON.parse(workflowNode.properties.metadata) : undefined,
        }
      }

      return {
        ...plan,
        message: {
          ...message,
          data: JSON.parse(message.data),
        },
        ...(issue ? { issue } : {}),
        ...(workflow ? { workflow } : {}),
      }
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
}
