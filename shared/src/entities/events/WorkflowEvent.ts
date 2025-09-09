/**
 * Minimal workflow event representation for cross-layer communication.
 * Avoids leaking domain internals; safe to persist/stream.
 */
export type WorkflowEventType =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.error"
  | "status"
  | "issue.fetched"
  | "llm.started"
  | "llm.completed"

export interface WorkflowEvent {
  type: WorkflowEventType
  timestamp: string // ISO timestamp for transport-agnostic ordering
  /**
   * Human-readable content describing the event, when applicable.
   */
  content?: string
  /**
   * Optional structured metadata, small and serializable.
   */
  metadata?: Record<string, unknown>
}
