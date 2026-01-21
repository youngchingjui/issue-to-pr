import neo4j, { DateTime, Integer } from "neo4j-driver"

import {
  type AnyEvent as appAnyEvent,
  type MessageEvent as appMessageEvent,
} from "@/shared/lib/types"
import {
  type AnyEvent,
  isLLMResponseWithPlan,
  type MessageEvent,
} from "@/shared/lib/types/db/neo4j"

export function neo4jToJs<T>(value: T) {
  if (value === null || value === undefined) return value
  if (neo4j.isInt(value)) {
    return (value as unknown as Integer).toNumber()
  }
  if (value instanceof DateTime) {
    return (value as DateTime).toStandardDate()
  }
  if (Array.isArray(value)) {
    return value.map((v) => neo4jToJs(v))
  }
  if (typeof value === "object") {
    const result = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = neo4jToJs(v)
    }
    return result
  }
  return value
}

export function jsToNeo4j<T>(value: T) {
  if (value === null || value === undefined) return value
  if (typeof value === "number") return neo4j.int(value)
  if (value instanceof Date) return neo4j.types.DateTime.fromStandardDate(value)
  if (Array.isArray(value)) return value.map((v) => jsToNeo4j(v))
  if (typeof value === "object") {
    const result = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = jsToNeo4j(v)
    }
    return result
  }
  return value
}

export async function toAppEvent(
  dbEvent: AnyEvent,
  workflowId: string
): Promise<appAnyEvent> {
  if (dbEvent.type === "llmResponse" && isLLMResponseWithPlan(dbEvent)) {
    // Destructure to exclude plan-specific properties from the spread
    const { version, status, editMessage, createdAt, ...restDbEvent } = dbEvent

    return {
      ...restDbEvent,
      createdAt: createdAt.toStandardDate(),
      type: "llmResponseWithPlan",
      workflowId,
      plan: {
        id: dbEvent.id,
        status: status,
        version: version.toNumber(),
        editMessage: editMessage,
      },
    }
  } else if (dbEvent.type === "workflowState") {
    return {
      state: dbEvent.state,
      content: dbEvent.content,
      type: "workflow.state",
      timestamp: dbEvent.createdAt.toStandardDate(),
      id: workflowId,
    }
  } else if (dbEvent.type === "status") {
    return {
      type: "status",
      content: dbEvent.content,
      timestamp: dbEvent.createdAt.toStandardDate(),
      id: workflowId,
    }
  } else if (
    dbEvent.type === "workflowStarted" ||
    dbEvent.type === "workflowCompleted" ||
    dbEvent.type === "workflowCancelled" ||
    dbEvent.type === "workflowCheckpointSaved" ||
    dbEvent.type === "workflowCheckpointRestored"
  ) {
    // Map camelCase DB types to dot-notation app types
    const typeMap: Record<string, string> = {
      workflowStarted: "workflow.started",
      workflowCompleted: "workflow.completed",
      workflowCancelled: "workflow.cancelled",
      workflowCheckpointSaved: "workflow.checkpoint.saved",
      workflowCheckpointRestored: "workflow.checkpoint.restored",
    }
    return {
      id: workflowId,
      type: typeMap[dbEvent.type] as
        | "workflow.started"
        | "workflow.completed"
        | "workflow.cancelled"
        | "workflow.checkpoint.saved"
        | "workflow.checkpoint.restored",
      timestamp: dbEvent.createdAt.toStandardDate(),
      content: dbEvent.content,
    }
  } else if (dbEvent.type === "workflowError") {
    // Convert workflowError to app error event
    return {
      id: dbEvent.id,
      type: "error" as const,
      content: dbEvent.message || dbEvent.content || "Unknown error",
      createdAt: dbEvent.createdAt.toStandardDate(),
      workflowId,
    }
  }
  return {
    ...dbEvent,
    createdAt: dbEvent.createdAt.toStandardDate(),
    workflowId,
  }
}

export async function toAppMessageEvent(
  dbEvent: MessageEvent,
  workflowId: string
): Promise<appMessageEvent> {
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
