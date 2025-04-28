import { Node, Record as Neo4jRecord } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"
import { PlanProperties, PlanNode } from "@/lib/types/plan"
import {
  WorkflowEvent,
  WorkflowEventType,
  WorkflowMetadata,
  WorkflowWithEvents,
} from "@/lib/types/workflow"

interface PlanResponse extends PlanProperties {
  // For API return: optional related data
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

  // Other workflow methods omitted for brevity (no change needed)

  /**
   * Finalize a message/event as a plan: set :Plan label and plan metadata directly on the LLM response Message/Event node.
   */
  async createPlan(params: {
    workflowId: string
    messageId: string
    issueNumber: number
    repoFullName: string
  }) {
    const session = await this.neo4j.getSession()
    try {
      // Find the message/event, add :Plan label and set plan props
      const result = await session.run(
        `
        MATCH (m:Event {id: $messageId, type: "llm_response"})
        SET m:Plan
        SET m.status = "draft",
            m.type = "issue_resolution",
            m.createdAt = datetime(),
            m.version = "1"
        // Link plan to issue for lookup convenience
        MERGE (i:Issue {number: $issueNumber, repoFullName: $repoFullName})
        MERGE (i)-[:HAS_PLAN]->(m)
        RETURN m
        `,
        {
          messageId: params.messageId,
          issueNumber: params.issueNumber,
          repoFullName: params.repoFullName,
        }
      )
      return result.records[0]?.get("m")?.properties as PlanProperties
    } finally {
      await session.close()
    }
  }

  /**
   * Find the latest (by createdAt) :Plan for an issue.
   * Returns unified PlanResponse.
   */
  async getPlanForIssue(
    issueNumber: number,
    repoFullName: string
  ): Promise<PlanResponse | null> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (i:Issue {number: $issueNumber, repoFullName: $repoFullName})-[:HAS_PLAN]->(p:Event:Plan)
        RETURN p, i
        ORDER BY p.createdAt DESC
        LIMIT 1
        `,
        { issueNumber, repoFullName }
      )

      if (result.records.length === 0) {
        return null
      }

      const plan = result.records[0].get("p")
      const issue = result.records[0].get("i")
      // Unify the output type structure
      return {
        ...(plan.properties as PlanProperties),
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

  /**
   * Get plan by ID (merged node)
   */
  async getPlanById(planId: string): Promise<PlanResponse | null> {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (p:Event:Plan {id: $planId})
        OPTIONAL MATCH (w:Workflow)<-[:PART_OF]-(p)
        OPTIONAL MATCH (i:Issue)-[:HAS_PLAN]->(p)
        RETURN p, w, i
        `,
        { planId }
      )

      if (result.records.length === 0) {
        return null
      }
      const plan = result.records[0].get("p")
      const workflow = result.records[0].get("w")
      const issue = result.records[0].get("i")
      return {
        ...(plan.properties as PlanProperties),
        workflow: workflow
          ? {
              id: workflow.properties.id,
              metadata: workflow.properties.metadata
                ? JSON.parse(workflow.properties.metadata)
                : {},
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

  /**
   * Update Plan status property.
   */
  async updatePlanStatus(
    planId: string,
    status: "draft" | "approved" | "implemented" | "rejected"
  ) {
    const session = await this.neo4j.getSession()
    try {
      const result = await session.run(
        `
        MATCH (p:Event:Plan {id: $planId})
        SET p.status = $status
        RETURN p
        `,
        {
          planId,
          status,
        }
      )
      return result.records[0]?.get("p")?.properties as PlanProperties
    } finally {
      await session.close()
    }
  }

  // All other existing workflow methods remain as is
}
