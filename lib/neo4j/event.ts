/**
 * @deprecated These functions will be migrated to the /lib/neo4j/repositories and /lib/neo4j/services folders.
 */

import { Integer, Node } from "neo4j-driver"
import { v4 as uuidv4 } from "uuid"
import { ZodTypeAny } from "zod"

import { n4j } from "@/lib/neo4j/client"
import {
  BaseEvent as appBaseEvent,
  StatusEvent as appStatusEvent,
} from "@/lib/types"
import { statusEventSchema as n4jStatusEventSchema } from "@/lib/types/db/neo4j"

// EVENT MANAGEMENT
// Helper methods for managing events and their relationships
/**
 * @deprecated This function will be migrated to the repositories and services folders.
 */
async function findFirstEvent(workflowId: string): Promise<string | null> {
  const session = await n4j.getSession()
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

/**
 * @deprecated This function will be migrated to the repositories and services folders.
 */
async function findLastEvent(workflowId: string): Promise<string | null> {
  const session = await n4j.getSession()
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

/**
 * @deprecated This function will be migrated to the repositories and services folders.
 */
async function createStartsWithRelationship(
  workflowId: string,
  eventId: string
): Promise<void> {
  const session = await n4j.getSession()
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

/**
 * @deprecated This function will be migrated to the repositories and services folders.
 */
async function createNextRelationship(
  fromEventId: string,
  toEventId: string
): Promise<void> {
  const session = await n4j.getSession()
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

/**
 * @deprecated This function will be migrated to the repositories and services folders.
 */
async function connectEventToWorkflow(
  workflowId: string,
  eventId: string,
  parentId?: string
): Promise<void> {
  if (parentId) {
    // If parentId is provided, simply create NEXT relationship from parent
    await createNextRelationship(parentId, eventId)
  } else {
    // Check if this is the first event
    const firstEventId = await findFirstEvent(workflowId)

    if (!firstEventId) {
      // If no first event, create STARTS_WITH relationship
      await createStartsWithRelationship(workflowId, eventId)
    } else {
      // Otherwise, find the last event and create NEXT relationship
      const lastEventId = await findLastEvent(workflowId)
      if (lastEventId) {
        await createNextRelationship(lastEventId, eventId)
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
 * @deprecated This function will be migrated to the repositories and services folders.
 */
async function createBaseEventNode<
  T extends appBaseEvent,
  U extends ZodTypeAny,
>(
  schema: U,
  {
    id = uuidv4(),
    content,
    type,
    labels = [],
    ...rest
  }: Omit<T, "createdAt" | "workflowId" | "id"> & {
    id?: string
    labels?: string[]
  }
): Promise<Omit<T, "workflowId">> {
  const session = await n4j.getSession()
  try {
    // Create property string for Cypher query
    const propEntries = [
      `id: $id`,
      `createdAt: datetime()`,
      `content: $content`,
      `type: $type`,
    ]

    // Add additional properties
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        propEntries.push(`${key}: $${key}`)
      }
    })

    const propString = propEntries.join(", ")

    // Build parameters object
    const params = {
      id,
      type,
      labels,
      content: content ?? null,
      ...rest,
    }

    const result = await session.run<{ e: Node<Integer, U> }>(
      `
        CREATE (e:Event {${propString}})
        FOREACH (label IN $labels | SET e:\`$\{label\}\`)
        RETURN e
        `,
      params
    )

    const event = result.records[0]?.get("e")?.properties
    const parsedEvent = schema.parse(event)
    return {
      ...parsedEvent,
      createdAt: new Date(),
    } as T
  } finally {
    await session.close()
  }
}

/**
 * @deprecated This function will be migrated to the repositories and services folders.
 */
export async function createStatusEvent({
  content,
  workflowId,
  parentId,
}: Omit<appStatusEvent, "id" | "createdAt" | "type"> & {
  parentId?: string
}): Promise<appStatusEvent> {
  try {
    // Create the event node
    const event = await createBaseEventNode<
      appStatusEvent,
      typeof n4jStatusEventSchema
    >(n4jStatusEventSchema, {
      content,
      type: "status",
    })

    // Connect it to the workflow
    await connectEventToWorkflow(workflowId, event.id, parentId)

    return {
      ...event,
      workflowId,
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}
