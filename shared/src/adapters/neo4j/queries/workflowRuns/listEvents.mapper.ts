import { QueryResult } from "neo4j-driver"

import { AllEvents } from "@/shared/entities"

import { type AnyEvent, anyEventSchema, ReviewComment } from "../../types"
import { ListEventsForWorkflowRunResult } from "./listEvents"

/**
 * Translates Neo4j event to domain event.
 * Keeps Neo4j storage schema separate from domain event schema.
 */
function neo4jEventToDomainEvent(neo4jEvent: AnyEvent): AllEvents {
  const id = neo4jEvent.id
  const timestamp = neo4jEvent.createdAt.toStandardDate()
  const isoTimestamp = timestamp.toISOString()

  switch (neo4jEvent.type) {
    // ===== Workflow Events =====
    case "workflowState": {
      // Map Neo4j state to domain state
      // Note: Neo4j allows "pending" but domain doesn't, so we map it to "running"
      const domainState =
        neo4jEvent.state === "pending" ? "running" : neo4jEvent.state
      return {
        id,
        timestamp,
        type: "workflow.state",
        state: domainState,
        content: neo4jEvent.content,
      }
    }

    case "status":
      return {
        id,
        timestamp,
        type: "status",
        content: neo4jEvent.content,
      }

    case "error":
      return {
        id,
        timestamp,
        type: "workflow.error",
        message: neo4jEvent.content,
      }

    // ===== Message Events =====
    case "systemPrompt":
      return {
        type: "system_prompt",
        timestamp: isoTimestamp,
        content: neo4jEvent.content,
      }

    case "userMessage":
      return {
        type: "user_message",
        timestamp: isoTimestamp,
        content: neo4jEvent.content,
      }

    case "llmResponse":
      return {
        type: "assistant_message",
        timestamp: isoTimestamp,
        content: neo4jEvent.content,
      }

    case "reasoning":
      return {
        type: "reasoning",
        timestamp: isoTimestamp,
        content: neo4jEvent.content,
      }

    case "toolCall":
      return {
        type: "tool.call",
        timestamp: isoTimestamp,
        content: neo4jEvent.content,
      }

    case "toolCallResult":
      return {
        type: "tool.result",
        timestamp: isoTimestamp,
        content: neo4jEvent.content,
      }

    case "reviewComment":
    // reviewComment doesn't exist in domain events yet
    // For now, throw it away (we're not currently using this feature)
    default:
      // Exhaustive check - will cause TS error if we miss a case
      const _exhaustive: never | ReviewComment = neo4jEvent
      throw new Error(`Unknown Neo4j event type: ${_exhaustive.type}`)
  }
}

export function mapListEvents(
  result: QueryResult<ListEventsForWorkflowRunResult>
): AllEvents[] {
  return result.records.map((record) => {
    const neo4jEvent = anyEventSchema.parse(record.get("e").properties)
    return neo4jEventToDomainEvent(neo4jEvent)
  })
}
