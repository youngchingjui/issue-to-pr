// Base type for all stream events
export interface BaseStreamEvent {
  type: string // Extensible event type
  data: unknown // Flexible payload type
}

// Lightweight event for LLM tokens
export interface TokenEvent extends BaseStreamEvent {
  type: "token"
  data: string // Just the token content
}

// For events requiring more structure
export interface StructuredEvent extends BaseStreamEvent {
  id?: string // Optional ID for events that need reference
  timestamp?: number // Only when timing is relevant
  metadata?: Record<string, unknown> // Optional metadata when needed
}

// Type guard helpers
export const isTokenEvent = (event: BaseStreamEvent): event is TokenEvent =>
  event.type === "token"

export const isStructuredEvent = (
  event: BaseStreamEvent
): event is StructuredEvent =>
  event.hasOwnProperty("id") ||
  event.hasOwnProperty("timestamp") ||
  event.hasOwnProperty("metadata")
