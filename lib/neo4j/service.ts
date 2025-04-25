import { Integer, Node } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"
import { WorkflowRun, WorkflowRunState, WorkflowState } from "@/lib/types/neo4j"

export class n4jService {
  private static instance: n4jService
  private client: Neo4jClient

  private constructor() {
    this.client = Neo4jClient.getInstance()
  }

  public static getInstance(): n4jService {
    if (!n4jService.instance) {
      n4jService.instance = new n4jService()
    }
    return n4jService.instance
  }

  // Workflow Runs
  // TODO: Migrate 'status' to 'state' in database
  public async listWorkflowRuns({
    issue = null,
  }: { issue?: { repoFullName: string; issueNumber: number } } = {}): Promise<
    (WorkflowRun & { state: WorkflowRunState })[]
  > {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{
        w: Node<Integer, WorkflowRun>
        lastStatus: string | null
      }>(
        `
        MATCH (w:WorkflowRun)
        ${issue ? `MATCH (w)-[:BASED_ON_ISSUE]->(i:Issue {number: $issue.issueNumber, repoFullName: $issue.repoFullName})` : ""}
        OPTIONAL MATCH (status:Message {type: 'status'})-[:PART_OF]->(w)
        OPTIONAL MATCH (error:Message {type: 'error'})-[:PART_OF]->(w)
        WITH w, collect(status) as statusNodes, collect(error) as errorNodes
        
        // Determine the final status based on priority
        WITH w,
             [node in statusNodes WHERE apoc.convert.fromJsonMap(node.data).status = 'completed'][0] as completedStatus,
             [node in statusNodes WHERE apoc.convert.fromJsonMap(node.data).status = 'running'][0] as runningStatus,
             size(errorNodes) > 0 as hasError
        
        WITH w, 
             CASE
               WHEN completedStatus IS NOT NULL 
                 THEN 'completed'
               WHEN hasError 
                 THEN 'error'
               WHEN runningStatus IS NOT NULL 
                 THEN 'running'
               ELSE null
             END as lastStatus
        
        RETURN w, lastStatus
        ORDER BY w.created_at DESC
        `,
        { issue }
      )
      const workflows = result.records.map((record) => record.get("w"))
      const lastStatus = result.records.map((record) =>
        record.get("lastStatus")
      )

      return workflows.map((workflow, index) => ({
        ...workflow.properties,
        state: lastStatus[index] as
          | "running"
          | "completed"
          | "error"
          | undefined,
      }))
    } finally {
      await session.close()
    }
  }

  private async findFirstEvent(workflowId: string): Promise<string | null> {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{ eventId: string }>(
        `
        MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH]->(e:Event)
        RETURN e.id as eventId
        LIMIT 1
        `,
        { workflowId }
      )
      return result.records[0]?.get("eventId") ?? null
    } finally {
      await session.close()
    }
  }

  private async findLastEvent(workflowId: string): Promise<string | null> {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{ eventId: string }>(
        `
        MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH|NEXT*]->(e:Event)
        WHERE NOT (e)-[:NEXT]->()
        RETURN e.id as eventId
        LIMIT 1
        `,
        { workflowId }
      )
      return result.records[0]?.get("eventId") ?? null
    } finally {
      await session.close()
    }
  }

  private async createEvent({
    id,
    state,
    details = null,
  }: {
    id: string
    state: WorkflowRunState
    details?: string
  }): Promise<WorkflowState> {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{ e: Node<Integer, WorkflowState> }>(
        `
        CREATE (e:Event:WorkflowState {
          id: $id,
          state: $state,
          details: $details,
          created_at: datetime()
        })
        RETURN e
        `,
        {
          id,
          state,
          details,
        }
      )
      return result.records[0]?.get("e")?.properties
    } catch (e) {
      console.error(e)
      throw e
    } finally {
      await session.close()
    }
  }

  private async createStartsWithRelationship(
    workflowId: string,
    eventId: string
  ): Promise<void> {
    const session = await this.client.getSession()
    try {
      await session.run(
        `
        MATCH (w:WorkflowRun {id: $workflowId})
        MATCH (e:Event {id: $eventId})
        CREATE (w)-[:STARTS_WITH]->(e)
        `,
        { workflowId, eventId }
      )
    } finally {
      await session.close()
    }
  }

  private async createNextRelationship(
    fromEventId: string,
    toEventId: string
  ): Promise<void> {
    const session = await this.client.getSession()
    try {
      await session.run(
        `
        MATCH (from:Event {id: $fromEventId})
        MATCH (to:Event {id: $toEventId})
        CREATE (from)-[:NEXT]->(to)
        `,
        { fromEventId, toEventId }
      )
    } finally {
      await session.close()
    }
  }

  public async createWorkflowStateEvent({
    id = uuidv4(),
    workflowId,
    state,
    details,
    parentId,
  }: Omit<WorkflowState, "id" | "createdAt"> & {
    id?: string
    parentId?: string
  }): Promise<WorkflowState> {
    try {
      // First, create the event node
      const event = await this.createEvent({ id, state, details })

      // Then handle the relationships based on the situation
      if (parentId) {
        // If parentId is provided, simply create NEXT relationship from parent
        await this.createNextRelationship(parentId, id)
      } else {
        // Check if this is the first event
        const firstEventId = await this.findFirstEvent(workflowId)

        if (!firstEventId) {
          // If no first event, create STARTS_WITH relationship
          await this.createStartsWithRelationship(workflowId, id)
        } else {
          // Otherwise, find the last event and create NEXT relationship
          const lastEventId = await this.findLastEvent(workflowId)
          if (lastEventId) {
            await this.createNextRelationship(lastEventId, id)
          } else {
            console.error(
              "No last event found for workflow, did not create NEXT relationship",
              workflowId
            )
          }
        }
      }

      return event
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}

// Export a singleton instance
export const n4j = n4jService.getInstance()
