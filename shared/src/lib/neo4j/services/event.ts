import { ManagedTransaction } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"

import {
  type WorkflowErrorEvent,
  type WorkflowStateEvent,
  type WorkflowStatusEvent,
} from "@/shared/entities/events/WorkflowEvent"
import { n4j } from "@/shared/lib/neo4j/client"
import {
  connectToWorkflow,
  createErrorEvent as dbCreateErrorEvent,
  createLLMResponseEvent as dbCreateLLMResponseEvent,
  createNext,
  createReasoningEvent as dbCreateReasoningEvent,
  createStatusEvent as dbCreateStatusEvent,
  createSystemPromptEvent as dbCreateSystemPromptEvent,
  createToolCallEvent as dbCreateToolCallEvent,
  createToolCallResultEvent as dbCreateToolCallResultEvent,
  createUserResponseEvent as dbCreateUserResponseEvent,
  createWorkflowStateEvent as dbCreateWorkflowStateEvent,
  deleteEventNode,
  findPrevAndNextEvent,
  get as repoGet,
} from "@/shared/lib/neo4j/repositories/event"
import {
  type LLMResponse,
  type ReasoningEvent,
  type SystemPrompt,
  type ToolCall,
  type ToolCallResult,
  type UserMessage,
  type WorkflowRunState,
} from "@/shared/lib/types"

// This function creates a message event node and connects it to the workflow event chain.
// If a parentId is provided, the event is connected to the parent node using a NEXT relationship.
// Otherwise, it is attached to the end of the event chain of the specified workflowRun.

// Note: I'm making individual functions for each event type for now.
// Later, I'll refactor to use a single function for all event types.
export async function createSystemPromptEvent({
  id = uuidv4(),
  workflowId,
  content,
  parentId,
}: {
  id?: string
  workflowId: string
  content: string
  parentId?: string
}): Promise<SystemPrompt> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateSystemPromptEvent(tx, {
          id,
          content,
          type: "systemPrompt",
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      ...result,
      createdAt: result.createdAt.toStandardDate(),
      workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createLLMResponseEvent({
  id = uuidv4(),
  workflowId,
  content,
  parentId,
  model,
}: {
  id?: string
  workflowId: string
  content: string
  parentId?: string
  model?: string
}): Promise<LLMResponse> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateLLMResponseEvent(tx, {
          id,
          content,
          model,
          type: "llmResponse",
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      ...result,
      createdAt: result.createdAt.toStandardDate(),
      workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createUserResponseEvent({
  id = uuidv4(),
  workflowId,
  content,
  parentId,
}: {
  id?: string
  workflowId: string
  content: string
  parentId?: string
}): Promise<UserMessage> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateUserResponseEvent(tx, {
          id,
          content,
          type: "userMessage",
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      ...result,
      createdAt: result.createdAt.toStandardDate(),
      workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createToolCallEvent({
  id = uuidv4(),
  workflowId,
  toolName,
  toolCallId,
  args,
  parentId,
}: {
  id?: string
  workflowId: string
  toolName: string
  toolCallId: string
  args: string
  parentId?: string
}): Promise<ToolCall> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateToolCallEvent(tx, {
          id,
          toolName,
          toolCallId,
          args,
          type: "toolCall",
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      ...result,
      createdAt: result.createdAt.toStandardDate(),
      workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createToolCallResultEvent({
  id = uuidv4(),
  workflowId,
  toolCallId,
  toolName,
  content,
  parentId,
}: {
  id?: string
  workflowId: string
  toolCallId: string
  toolName: string
  content: string
  parentId?: string
}): Promise<ToolCallResult> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateToolCallResultEvent(tx, {
          id,
          toolCallId,
          toolName,
          content,
          type: "toolCallResult",
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      ...result,
      createdAt: result.createdAt.toStandardDate(),
      workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createReasoningEvent({
  id = uuidv4(),
  workflowId,
  summary,
  parentId,
}: {
  id?: string
  workflowId: string
  summary: string
  parentId?: string
}): Promise<ReasoningEvent> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateReasoningEvent(tx, {
          id,
          summary,
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      ...result,
      createdAt: result.createdAt.toStandardDate(),
      workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createStatusEvent({
  id = uuidv4(),
  workflowId,
  content,
  parentId,
}: {
  id?: string
  workflowId: string
  content: string
  parentId?: string
}): Promise<WorkflowStatusEvent> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateStatusEvent(tx, {
          id,
          content,
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      type: "status",
      content: result.content,
      timestamp: result.createdAt.toStandardDate(),
      id: workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createErrorEvent({
  id = uuidv4(),
  workflowId,
  content,
  parentId,
}: {
  id?: string
  workflowId: string
  content: string
  parentId?: string
}): Promise<WorkflowErrorEvent> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateErrorEvent(tx, {
          id,
          content,
          type: "error",
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id, parentId)

        return eventNode
      }
    )

    return {
      type: "workflow.error",
      message: result.content,
      timestamp: result.createdAt.toStandardDate(),
      id: workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export async function createWorkflowStateEvent({
  id = uuidv4(),
  workflowId,
  state,
  content,
}: {
  id?: string
  workflowId: string
  state: WorkflowRunState
  content?: string
}): Promise<WorkflowStateEvent> {
  const session = await n4j.getSession()
  try {
    const result = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Create the event node
        const eventNode = await dbCreateWorkflowStateEvent(tx, {
          id,
          state,
          content,
        })

        // Attach it to the workflow
        await connectToWorkflow(tx, workflowId, id)

        return eventNode
      }
    )

    return {
      type: "workflow.state",
      state: result.state,
      timestamp: result.createdAt.toStandardDate(),
      id: workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

// Service-layer function to get an event by id
export async function getEventById(eventId: string) {
  const session = await n4j.getSession()
  try {
    let event
    await session.executeRead(async (tx: ManagedTransaction) => {
      event = await repoGet(tx, eventId)
    })
    return event
  } finally {
    await session.close()
  }
}

/**
 * Deletes an event node from the Neo4j database by its event ID.
 *
 * This function removes the specified event node (`Event` label) and its direct
 * relationships in the event chain. If the event is part of a sequence (i.e., it has
 * both a previous and a next event), it will reconnect the previous and next events
 * directly to maintain the chain integrity.
 *
 * The operation is performed within a write transaction. If the event does not exist,
 * the function completes silently.
 */
export async function deleteEvent(eventId: string) {
  const session = await n4j.getSession()
  try {
    await session.executeWrite(async (tx: ManagedTransaction) => {
      // Find previous and next event, if they exist
      const { prevId, nextId } = await findPrevAndNextEvent(tx, eventId)
      // Delete the event and any NEXT relationships
      await deleteEventNode(tx, eventId)
      // If both previous and next exist, connect them
      if (prevId && nextId) {
        await createNext(tx, prevId, nextId)
      }
    })
  } finally {
    await session.close()
  }
}
