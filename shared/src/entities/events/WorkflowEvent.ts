/**
 * Minimal workflow event representation for cross-layer communication.
 * Avoids leaking domain internals; safe to persist/stream.
 */

// TODO: I think these need to be at like a "Base Event" level or something
export type Metadata = Record<string, unknown> | undefined
export type WorkflowId = string

export type WorkflowEventType =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.error"
  | "workflow.state" // generic workflow state update
  | "status"
  | "issue.fetched"
  | "llm.started"
  | "llm.completed"

export interface WorkflowEvent {
  id: WorkflowId
  type: WorkflowEventType
  timestamp: string // ISO timestamp for transport-agnostic ordering
  /**
   * Human-readable content describing the event, when applicable.
   */
  content?: string
  /**
   * Optional structured metadata, small and serializable.
   * For tool events, include identifiers like toolName/toolCallId/args.
   * For workflow.state, include `state` (running|completed|error|timedOut).
   */
  metadata?: Metadata
}
