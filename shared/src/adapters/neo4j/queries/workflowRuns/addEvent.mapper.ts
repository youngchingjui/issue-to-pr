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
        content: neo4jEvent.content ?? "",
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

    case "workflowStarted":
      // Neo4j "workflowStarted" → WorkflowEvent "workflow.started"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "workflow.started",
        content: neo4jEvent.content,
      }

    case "workflowCompleted":
      // Neo4j "workflowCompleted" → WorkflowEvent "workflow.completed"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "workflow.completed",
        content: neo4jEvent.content,
      }

    case "workflowCancelled":
      // Neo4j "workflowCancelled" → WorkflowEvent "workflow.cancelled"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "workflow.cancelled",
        content: neo4jEvent.content,
      }

    case "workflowCheckpointSaved":
      // Neo4j "workflowCheckpointSaved" → WorkflowEvent "workflow.checkpoint.saved"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "workflow.checkpoint.saved",
        content: neo4jEvent.content,
      }

    case "workflowCheckpointRestored":
      // Neo4j "workflowCheckpointRestored" → WorkflowEvent "workflow.checkpoint.restored"
      return {
        id: neo4jEvent.id,
        timestamp: workflowTimestamp,
        type: "workflow.checkpoint.restored",
        content: neo4jEvent.content,
      }

    default:
      // TypeScript will ensure this is exhaustive
      const _exhaustive: never = neo4jEvent
      throw new Error(`Unknown event type: ${(_exhaustive as AnyEvent).type}`)
  }
}

/**
 * Maps domain event type to Neo4j event type
 * This is the inverse of the mapping done in mapNeo4jEventToDomain
 */
export function mapDomainEventTypeToNeo4j(
  domainEventType: AllEvents["type"]
): string {
  switch (domainEventType) {
    // WorkflowEvent types
    case "workflow.error":
      return "error"
    case "workflow.state":
      return "workflowState"
    case "status":
      return "status"
    case "workflow.started":
      return "workflowStarted"
    case "workflow.completed":
      return "workflowCompleted"
    case "workflow.cancelled":
      return "workflowCancelled"
    case "workflow.checkpoint.saved":
      return "workflowCheckpointSaved"
    case "workflow.checkpoint.restored":
      return "workflowCheckpointRestored"

    // MessageEvent types
    case "system_prompt":
      return "systemPrompt"
    case "user_message":
      return "userMessage"
    case "assistant_message":
      return "llmResponse"
    case "tool.call":
      return "toolCall"
    case "tool.result":
      return "toolCallResult"
    case "reasoning":
      return "reasoning"

    // LLMEvent types (not currently stored in Neo4j, but mapping for future use)
    case "llm.started":
      return "llmStarted"
    case "llm.completed":
      return "llmCompleted"

    // GithubEvent types (deprecated)
    case "issue.fetched":
      return "issueFetched"

    default:
      // If we get here, TypeScript has caught an unmapped type
      const _exhaustive: never = domainEventType
      throw new Error(`Unknown domain event type: ${_exhaustive}`)
  }
}
