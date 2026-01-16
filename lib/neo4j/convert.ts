import neo4j, { DateTime, Integer } from "neo4j-driver"

import {
  AnyEvent as appAnyEvent,
  MessageEvent as appMessageEvent,
} from "@/lib/types"
import {
  AnyEvent,
  isLLMResponseWithPlan,
  MessageEvent,
} from "@/lib/types/db/neo4j"

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
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = neo4jToJs(v)
    }
    return result as T
  }
  return value
}

export function jsToNeo4j<T>(value: T) {
  if (value === null || value === undefined) return value
  if (typeof value === "number") return neo4j.int(value)
  if (value instanceof Date) return neo4j.types.DateTime.fromStandardDate(value)
  if (Array.isArray(value)) return value.map((v) => jsToNeo4j(v))
  if (typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = jsToNeo4j(v)
    }
    return result as T
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
    // Map new workflow lifecycle events to a generic status event for the app layer
    const labelMap: Record<string, string> = {
      workflowStarted: "Workflow started",
      workflowCompleted: "Workflow completed",
      workflowCancelled: "Workflow cancelled",
      workflowCheckpointSaved: "Workflow checkpoint saved",
      workflowCheckpointRestored: "Workflow checkpoint restored",
    }
    return {
      type: "status",
      content: dbEvent.content ?? labelMap[dbEvent.type] ?? "",
      timestamp: dbEvent.createdAt.toStandardDate(),
      id: workflowId,
    }
  }
  return {
    ...dbEvent,
    createdAt: dbEvent.createdAt.toStandardDate(),
    workflowId,
  } as unknown as appAnyEvent
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
  } as unknown as appMessageEvent
}

