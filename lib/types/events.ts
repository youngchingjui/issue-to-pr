import { StatusData, WorkflowEventType } from "@/lib/types/workflow"

export type StreamEventType = WorkflowEventType | "token"

// Base type for all stream events
export interface BaseStreamEvent {
  type: StreamEventType
  data: unknown
  timestamp: Date | number // Allow both Date objects and timestamps
  metadata?: Record<string, unknown>
}

// Lightweight event for LLM tokens
export interface TokenEvent extends BaseStreamEvent {
  type: "token"
  data: string // Just the token content
  timestamp: number // Tokens always use timestamps for performance
}

// For events requiring more structure
export interface StructuredEvent extends BaseStreamEvent {
  id?: string // Optional ID for events that need reference
  timestamp: Date // Structured events use Date objects
}

// Status event type
export interface StatusStreamEvent extends BaseStreamEvent {
  type: "status"
  data: StatusData
  timestamp: Date
}

// Complete stream event with workflow ID
export interface StreamEvent extends BaseStreamEvent {
  workflowId: string
}

// Type guard helpers
export const isTokenEvent = (event: BaseStreamEvent): event is TokenEvent =>
  event.type === "token"

export const isStructuredEvent = (
  event: BaseStreamEvent
): event is StructuredEvent => event.hasOwnProperty("id")

export const isStatusEvent = (
  event: BaseStreamEvent
): event is StatusStreamEvent => event.type === "status"
