import { Integer, ManagedTransaction, Node } from "neo4j-driver"

import { AnyEvent as appAnyEvent } from "@/lib/types"
import {
  AnyEvent,
  anyEventSchema,
  isLLMResponseWithPlan,
  LLMResponse,
  llmResponseSchema,
  SystemPrompt,
  systemPromptSchema,
  UserMessage,
  userMessageSchema,
} from "@/lib/types/db/neo4j"

export async function get(
  tx: ManagedTransaction,
  workflowId: string
): Promise<AnyEvent> {
  const result = await tx.run<{ e: Node<Integer, AnyEvent, "Event"> }>(
    `
    MATCH (e:Event {id: $eventId}) 
    RETURN e 
    LIMIT 1
    `,
    { eventId: workflowId }
  )
  const raw = result.records[0]?.get("e")?.properties
  return anyEventSchema.parse(raw)
}

export async function createSystemPromptEvent(
  tx: ManagedTransaction,
  event: Omit<SystemPrompt, "createdAt">
): Promise<SystemPrompt> {
  const { id, type, content } = event
  const result = await tx.run<{ e: Node<Integer, LLMResponse, "Event"> }>(
    `
      CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: $type, content: $content})
      RETURN e
      `,
    { id, type, content }
  )
  return systemPromptSchema.parse(result.records[0]?.get("e")?.properties)
}

export async function createLLMResponseEvent(
  tx: ManagedTransaction,
  event: Omit<LLMResponse, "createdAt">
): Promise<LLMResponse> {
  const { id, type, content } = event
  const result = await tx.run<{ e: Node<Integer, LLMResponse, "Event"> }>(
    `
    CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: $type, content: $content, model: $model})
    RETURN e
    `,
    { id, type, content, model: event.model || null }
  )
  return llmResponseSchema.parse(result.records[0]?.get("e")?.properties)
}

export async function createUserResponseEvent(
  tx: ManagedTransaction,
  event: Omit<UserMessage, "createdAt">
): Promise<UserMessage> {
  const { id, type, content } = event
  const result = await tx.run<{ e: Node<Integer, UserMessage, "Event"> }>(
    `
      CREATE (e:Event:Message {id: $id, createdAt: datetime(), type: $type, content: $content})
      RETURN e
      `,
    { id, type, content }
  )
  return userMessageSchema.parse(result.records[0]?.get("e")?.properties)
}

export async function findFirst(
  tx: ManagedTransaction,
  workflowId: string
): Promise<ReturnType<typeof anyEventSchema.parse> | null> {
  const result = await tx.run(
    `MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH]->(e:Event) RETURN e LIMIT 1`,
    { workflowId }
  )
  const raw = result.records[0]?.get("e")?.properties
  return raw ? anyEventSchema.parse(raw) : null
}

export async function findLast(
  tx: ManagedTransaction,
  workflowId: string
): Promise<ReturnType<typeof anyEventSchema.parse> | null> {
  const result = await tx.run(
    `MATCH (w:WorkflowRun {id: $workflowId})-[:STARTS_WITH|NEXT*]->(e:Event) WHERE NOT (e)-[:NEXT]->() RETURN e LIMIT 1`,
    { workflowId }
  )
  const raw = result.records[0]?.get("e")?.properties
  return raw ? anyEventSchema.parse(raw) : null
}

export async function createStartsWith(
  tx: ManagedTransaction,
  workflowId: string,
  eventId: string
): Promise<void> {
  await tx.run(
    `MATCH (w:WorkflowRun {id: $workflowId}) MATCH (e:Event {id: $eventId}) CREATE (w)-[:STARTS_WITH]->(e)`,
    { workflowId, eventId }
  )
}

/**
 * Creates a NEXT relationship between two events.
 * If NEXT relationship already exists, it will be overwritten.
 * If either event does not exist, nothing will happen.
 */
export async function createNext(
  tx: ManagedTransaction,
  fromEventId: string,
  toEventId: string
): Promise<void> {
  await tx.run(
    `
    MATCH (from:Event {id: $fromEventId})
    OPTIONAL MATCH (to:Event {id: $toEventId})
    MERGE (from)-[:NEXT]->(to)
    `,
    { fromEventId, toEventId }
  )
}

export async function connectToWorkflow(
  tx: ManagedTransaction,
  workflowId: string,
  eventId: string,
  parentId?: string
): Promise<void> {
  if (parentId) {
    await createNext(tx, parentId, eventId)
  } else {
    const firstEvent = await findFirst(tx, workflowId)
    if (!firstEvent) {
      await createStartsWith(tx, workflowId, eventId)
    } else {
      const lastEvent = await findLast(tx, workflowId)
      if (lastEvent) {
        await createNext(tx, lastEvent.id, eventId)
      } else {
        console.error(
          "No last event found for workflow, did not create NEXT relationship",
          workflowId
        )
      }
    }
  }
}

/**
 * Finds the previous and next event IDs for a given event in the event chain.
 */
export async function findPrevAndNextEvent(
  tx: ManagedTransaction,
  eventId: string
): Promise<{ prevId: string | null; nextId: string | null }> {
  const result = await tx.run<{ prevId: string | null; nextId: string | null }>(
    `
    MATCH (e:Event {id: $eventId})
    OPTIONAL MATCH (prev:Event)-[:NEXT]->(e)
    OPTIONAL MATCH (e)-[:NEXT]->(next:Event)
    RETURN prev.id AS prevId, next.id AS nextId
    `,
    { eventId }
  )
  const record = result.records[0]
  return {
    prevId: record?.get("prevId"),
    nextId: record?.get("nextId"),
  }
}

/**
 * Detaches and deletes event node.
 */
export async function deleteEventNode(
  tx: ManagedTransaction,
  eventId: string
): Promise<void> {
  await tx.run(
    `
    MATCH (e:Event {id: $eventId})
    DETACH DELETE e
    `,
    { eventId }
  )
}

export async function toAppEvent(
  dbEvent: AnyEvent,
  workflowId: string
): Promise<appAnyEvent> {
  if (dbEvent.type === "llmResponse" && isLLMResponseWithPlan(dbEvent)) {
    return {
      ...dbEvent,
      createdAt: dbEvent.createdAt.toStandardDate(),
      type: "llmResponseWithPlan",
      workflowId,
      plan: {
        id: dbEvent.id,
        status: dbEvent.status,
        version: dbEvent.version.toNumber(),
        editMessage: dbEvent.editMessage,
      },
    }
  }
  return {
    ...dbEvent,
    createdAt: dbEvent.createdAt.toStandardDate(),
    workflowId,
  }
}
