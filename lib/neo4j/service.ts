import { DateTime, Integer, Node } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import { Neo4jClient } from "@/lib/neo4j/client"
import {
  AnyEvent,
  BaseEvent,
  ErrorEvent,
  Issue,
  LLMResponse,
  ReviewComment,
  StatusEvent,
  SystemPrompt,
  ToolCall,
  ToolCallResult,
  UserMessage,
  WorkflowRun,
  WorkflowRunState,
  WorkflowState,
} from "@/lib/types/neo4j"
import { workflowRunWithDetailsSchema } from "@/lib/types/schemas"

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

  // WORKFLOW RUNS
  // TODO: Migrate 'status' to 'state' in database
  public async listWorkflowRuns({
    issue,
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
        state: lastStatus[index] as WorkflowRunState,
      }))
    } finally {
      await session.close()
    }
  }

  public async getWorkflow(workflowId: string): Promise<WorkflowRun | null> {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{ w: Node<Integer, WorkflowRun> }>(
        `
        MATCH (w:WorkflowRun {id: $workflowId})
        RETURN w
        LIMIT 1
        `,
        { workflowId }
      )

      return result.records[0]?.get("w")?.properties ?? null
    } finally {
      session.close()
    }
  }

  // EVENTS
  public async listEventsForWorkflow(workflowId: string): Promise<Event[]> {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{ e: Node<Integer, Event> }>(
        `
        MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH|NEXT*]->(e:Event)
        RETURN e
        `,
        { workflowId }
      )

      return result.records.map((record) => record.get("e")?.properties)
    } finally {
      session.close()
    }
  }

  public async getWorkflowRunWithDetails({
    workflowRunId,
  }: {
    workflowRunId: string
  }): Promise<{
    workflow: WorkflowRun
    events: (AnyEvent & { labels: string[] })[]
    issue: Issue
  }> {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{
        w: Node<Integer, WorkflowRun, "WorkflowRun">
        i: Node<Integer, Issue, "Issue">
        eventData: {
          event: Node<Integer, AnyEvent, "Event">
          labels: string[]
        }[]
      }>(
        `
        MATCH (w:WorkflowRun {id: $workflowRunId})
        MATCH (i:Issue)<-[:BASED_ON_ISSUE]-(w)
        
        // Match all events
        MATCH (w)-[:STARTS_WITH|NEXT*]-(e:Event)
        
        // Use labels() function to get all labels for each event
        WITH w, i, e, labels(e) as eventLabels
        
        // Collect all events with their labels
        WITH w, i, collect({event: e, labels: eventLabels}) as eventData
        
        RETURN w, i, eventData
        `,
        { workflowRunId }
      )

      const workflowProps = result.records[0]?.get("w")?.properties
      const workflow = {
        ...workflowProps,
        created_at:
          workflowProps?.created_at instanceof DateTime
            ? workflowProps.created_at.toStandardDate()
            : workflowProps?.created_at,
      }

      const issueProps = result.records[0]?.get("i")?.properties
      const issue = {
        ...issueProps,
        createdAt:
          issueProps?.createdAt instanceof DateTime
            ? issueProps.createdAt.toStandardDate()
            : issueProps.createdAt,
        updatedAt:
          issueProps?.updatedAt instanceof DateTime
            ? issueProps.updatedAt.toStandardDate()
            : issueProps.updatedAt,
      }

      // Process events and identify plans
      const eventData = result.records[0]?.get("eventData")

      const events = eventData.map((item) => {
        const eventProps = item.event.properties
        const labels = item.labels

        // Create base event with common properties and convert dates
        const baseEvent = {
          ...eventProps,
          labels,
          workflowId: workflow.id,
          createdAt:
            eventProps.createdAt instanceof DateTime
              ? eventProps.createdAt.toStandardDate()
              : eventProps.createdAt,
        }

        // Based on the type, return the appropriate typed event
        switch (eventProps.type) {
          case "systemPrompt":
            return {
              ...baseEvent,
              type: "systemPrompt",
              content: eventProps.content,
            } as SystemPrompt & { labels: string[] }
          case "userMessage":
            return {
              ...baseEvent,
              type: "userMessage",
              content: eventProps.content,
            } as UserMessage & { labels: string[] }
          // TODO: Some of these LLM Responses might also have the 'Plan' label
          // Need to build interface that reflects combination of LLMResponse and Plan
          case "llmResponse":
            return {
              ...baseEvent,
              type: "llmResponse",
              content: eventProps.content,
            } as LLMResponse & { labels: string[] }
          case "toolCall":
            return {
              ...baseEvent,
              type: "toolCall",
              toolName: eventProps.toolName,
              toolCallId: eventProps.toolCallId,
              arguments: eventProps.arguments,
            } as ToolCall & { labels: string[] }
          case "toolCallResult":
            return {
              ...baseEvent,
              type: "toolCallResult",
              toolCallId: eventProps.toolCallId,
              toolName: eventProps.toolName,
              content: eventProps.content,
            } as ToolCallResult & { labels: string[] }
          case "workflowState":
            return {
              ...baseEvent,
              type: "workflowState",
              state: eventProps.state,
            } as WorkflowState & { labels: string[] }
          case "reviewComment":
            return {
              ...baseEvent,
              type: "reviewComment",
              content: eventProps.content,
              planId: eventProps.planId,
            } as ReviewComment & { labels: string[] }
          case "status":
            return {
              ...baseEvent,
              type: "status",
              content: eventProps.content,
            } as StatusEvent & { labels: string[] }
          case "error":
            return {
              ...baseEvent,
              type: "error",
              content: eventProps.content,
            } as ErrorEvent & { labels: string[] }
          default:
            throw new Error(
              `Unknown event type. Event: ${JSON.stringify(item)}`
            )
        }
      })

      const response = { workflow, events, issue }

      // Validate the response against our schema
      try {
        workflowRunWithDetailsSchema.parse(response)
      } catch (error) {
        console.error("Data validation failed:", error)
        throw new Error("Data from Neo4j does not match expected schema")
      }

      return response
    } finally {
      session.close()
    }
  }

  // ISSUES
  public async getIssueFromWorkflow(workflowId: string): Promise<Issue | null> {
    const session = await this.client.getSession()
    try {
      const result = await session.run<{ i: Node<Integer, Issue> }>(
        `
        MATCH (w:WorkflowRun {id: $workflowId})-[:BASED_ON_ISSUE]->(i:Issue)
        RETURN i
        `,
        { workflowId }
      )

      return result.records[0]?.get("i")?.properties ?? null
    } finally {
      session.close()
    }
  }

  // EVENT MANAGEMENT
  // Helper methods for managing events and their relationships

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

  private async connectEventToWorkflow(
    workflowId: string,
    eventId: string,
    parentId?: string
  ): Promise<void> {
    if (parentId) {
      // If parentId is provided, simply create NEXT relationship from parent
      await this.createNextRelationship(parentId, eventId)
    } else {
      // Check if this is the first event
      const firstEventId = await this.findFirstEvent(workflowId)

      if (!firstEventId) {
        // If no first event, create STARTS_WITH relationship
        await this.createStartsWithRelationship(workflowId, eventId)
      } else {
        // Otherwise, find the last event and create NEXT relationship
        const lastEventId = await this.findLastEvent(workflowId)
        if (lastEventId) {
          await this.createNextRelationship(lastEventId, eventId)
        } else {
          console.error(
            "No last event found for workflow, did not create NEXT relationship",
            workflowId
          )
        }
      }
    }
  }

  // Base method for creating any type of event node
  private async createBaseEventNode<T extends BaseEvent>({
    id = uuidv4(),
    content,
    type,
    labels = [],
    ...rest
  }: Omit<BaseEvent, "createdAt" | "workflowId" | "id"> & {
    id?: string
    labels?: string[]
  } & Record<string, unknown>): Promise<T> {
    const session = await this.client.getSession()
    try {
      // Create property string for Cypher query
      const propEntries = [`id: $id`, `created_at: datetime()`]

      if (content) {
        propEntries.push(`content: $content`)
      }

      // Add type to properties
      propEntries.push(`type: $type`)

      // Add additional properties
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          propEntries.push(`${key}: $${key}`)
        }
      })

      const propString = propEntries.join(", ")

      // Build parameters object
      const params: Record<string, unknown> = {
        id,
        type,
        labels,
        ...rest,
      }

      if (content !== null) {
        params.content = content
      }

      const result = await session.run<{ e: Node<Integer, T> }>(
        `
        CREATE (e:Event {${propString}})
        FOREACH (label IN $labels | SET e:\`$\{label\}\`)
        RETURN e
        `,
        params
      )

      return {
        ...result.records[0]?.get("e")?.properties,
        createdAt: new Date(),
      } as T
    } finally {
      await session.close()
    }
  }

  // Event creation methods

  // Public method to create a basic event
  public async createEvent({
    content,
    workflowId,
    parentId,
    labels = [],
  }: {
    content?: string
    workflowId: string
    parentId?: string
    labels?: string[]
  }): Promise<StatusEvent> {
    try {
      // Create the event node
      const event = await this.createBaseEventNode<StatusEvent>({
        content,
        type: "status",
        labels,
      })

      // Connect it to the workflow
      await this.connectEventToWorkflow(workflowId, event.id, parentId)

      return event
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  // Create a specialized workflow state event
  public async createWorkflowStateEvent({
    workflowId,
    state,
    content,
    parentId,
  }: {
    workflowId: string
    state: WorkflowRunState
    content?: string
    parentId?: string
  }): Promise<WorkflowState> {
    try {
      // Create the event node with state property
      const event = await this.createBaseEventNode<WorkflowState>({
        content,
        type: "workflowState",
        properties: { state },
      })

      // Connect it to the workflow
      await this.connectEventToWorkflow(workflowId, event.id, parentId)

      return event
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  // Create a message event (user, system, llm response, tool call, tool result)
  public async createMessageEvent(
    params: (
      | SystemPrompt
      | UserMessage
      | LLMResponse
      | ToolCall
      | ToolCallResult
    ) & {
      workflowId: string
      parentId?: string
    }
  ): Promise<
    SystemPrompt | UserMessage | LLMResponse | ToolCall | ToolCallResult
  > {
    try {
      const { content, workflowId, parentId, type, ...rest } = params

      // Create the message event node
      const event = await this.createBaseEventNode<typeof params>({
        content,
        type,
        labels: ["Message"],
        ...rest,
      })

      // Connect it to the workflow
      await this.connectEventToWorkflow(workflowId, event.id, parentId)

      return event
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  // Create a tool call event
  public async createToolCallEvent({
    workflowId,
    toolName,
    parameters,
    content,
    parentId,
  }: {
    workflowId: string
    toolName: string
    parameters: Record<string, unknown>
    content?: string
    parentId?: string
  }): Promise<ToolCall> {
    try {
      // Create the tool call event node
      const event = await this.createBaseEventNode<ToolCall>({
        content,
        type: "toolCall",
        toolName,
        parameters: JSON.stringify(parameters),
      })

      // Connect it to the workflow
      await this.connectEventToWorkflow(workflowId, event.id, parentId)

      return {
        ...event,
        parameters, // Restore the original object since we JSON.stringify it for storage
      } as ToolCall
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  // Create a tool call result event
  public async createToolResultEvent({
    workflowId,
    toolName,
    content,
    parentId,
    toolCallId,
  }: {
    workflowId: string
    toolName: string
    content: string
    parentId?: string
    toolCallId: string
  }): Promise<ToolCallResult> {
    try {
      // Create the tool result event node
      const event = await this.createBaseEventNode<ToolCallResult>({
        content,
        type: "toolCallResult",
        toolName,
        toolCallId,
      })

      // Connect it to the workflow
      await this.connectEventToWorkflow(workflowId, event.id, parentId)

      return event
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  // Create a review comment event
  public async createReviewCommentEvent({
    workflowId,
    content,
    planId,
    parentId,
  }: {
    workflowId: string
    content: string
    planId: string
    parentId?: string
  }): Promise<ReviewComment> {
    try {
      // Create the review comment event node
      const event = await this.createBaseEventNode<ReviewComment>({
        content,
        type: "reviewComment",
        planId,
      })

      // Connect it to the workflow
      await this.connectEventToWorkflow(workflowId, event.id, parentId)

      return event
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}

// Export a singleton instance
export const n4j = n4jService.getInstance()
