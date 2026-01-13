import type { QueryResult } from "neo4j-driver"

import { type AllEvents } from "@/shared/entities"

import { type AnyEvent, anyEventSchema } from "../../types"
import type { AddEventResult } from "./addEvent"

/**
 * Maps the Neo4j query result from addEvent to an AllEvents entity
 *
 * Pattern: Parse (Neo4j schema) → Transform (to domain structure) → Return
 */
export function mapAddEventResult(
  result: QueryResult<AddEventResult>
): AllEvents {
  const record = result.records[0]
  if (!record) {
    throw new Error("No event was created")
  }

  // 1. Parse: Reconstruct event node and validate with Neo4j schema
  const eventNode = {
    id: record.get("eventId"),
    type: record.get("eventType"),
    content: record.get("content"),
    createdAt: record.get("createdAt"),
  }

  // Validate against Neo4j event schemas - this gives us type safety on Neo4j structure
  const validatedEvent = anyEventSchema.parse(eventNode)

  // 2. Transform: Map Neo4j event to domain event
  return mapNeo4jEventToDomain(validatedEvent)
}

/**
 * Transforms a validated Neo4j event to domain AllEvents type
 * Maps createdAt (Neo4j DateTime) → timestamp (JavaScript Date)
 * Maps Neo4j event type names → domain event type names
 */
function mapNeo4jEventToDomain(neo4jEvent: AnyEvent): AllEvents {
  const jsDate = neo4jEvent.createdAt.toStandardDate()

  // WorkflowEvent uses Date, MessageEvent uses ISO string
  // TODO: Standardize timestamp types across all events
  const workflowTimestamp = jsDate
  const messageTimestamp = jsDate.toISOString()

  // Switch on Neo4j event type and map to domain event structure
  switch (neo4jEvent.type) {
    case "error":
      // Neo4j "error" → WorkflowEvent "workflow.error"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "workflow.error",
        message: neo4jEvent.content,
      }

    case "status":
      // Maps directly - WorkflowEvent "status"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "status",
        content: neo4jEvent.content,
      }

    case "workflowState":
      // Neo4j "workflowState" → WorkflowEvent "workflow.state"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "workflow.state",
        state: neo4jEvent.state,
      }

    case "systemPrompt":
      // Neo4j "systemPrompt" → MessageEvent "system_prompt"
      return {
        timestamp: messageTimestamp,
        type: "system_prompt",
        content: neo4jEvent.content,
        metadata: {},
      }

    case "userMessage":
      // Neo4j "userMessage" → MessageEvent "user_message"
      return {
        timestamp: messageTimestamp,
        type: "user_message",
        content: neo4jEvent.content,
        metadata: {},
      }

    case "llmResponse":
      // Neo4j "llmResponse" → MessageEvent "assistant_message"
      return {
        timestamp: messageTimestamp,
        type: "assistant_message",
        content: neo4jEvent.content,
        metadata: {},
      }

    case "reasoning":
      // Maps directly - MessageEvent "reasoning"
      return {
        timestamp: messageTimestamp,
        type: "reasoning",
        content: neo4jEvent.summary,
        metadata: {},
      }

    case "reviewComment":
      // Neo4j "reviewComment" → map to assistant_message for now
      // TODO: Consider if this should be a separate domain event type
      return {
        timestamp: messageTimestamp,
        type: "assistant_message",
        content: neo4jEvent.content,
        metadata: { original_type: "reviewComment" },
      }

    case "toolCall":
      // Neo4j "toolCall" → MessageEvent "tool.call"
      return {
        timestamp: messageTimestamp,
        type: "tool.call",
        content: neo4jEvent.toolName,
        metadata: {
          toolCallId: neo4jEvent.toolCallId,
          args: neo4jEvent.args,
        },
      }

    case "toolCallResult":
      // Neo4j "toolCallResult" → MessageEvent "tool.result"
      return {
        timestamp: messageTimestamp,
        type: "tool.result",
        content: neo4jEvent.content,
        metadata: {
          toolCallId: neo4jEvent.toolCallId,
          toolName: neo4jEvent.toolName,
        },
      }

    default:
      // TypeScript will ensure this is exhaustive
      const _exhaustive: never = neo4jEvent
      throw new Error(`Unknown event type: ${(_exhaustive as AnyEvent).type}`)
  }
}
