/**
 * Minimal workflow event representation for cross-layer communication.
 * Avoids leaking domain internals; safe to persist/stream.
 */
export type WorkflowEventType =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.error"
  | "workflow.state" // generic workflow state update
  | "status"
  | "issue.fetched"
  | "llm.started"
  | "llm.completed"
  // Events commonly emitted by autoResolveIssue and underlying agents
  | "system.prompt"
  | "user.message"
  | "llm.response"
  | "tool.call"
  | "tool.result"
  | "reasoning"

export interface WorkflowEvent {
  type: WorkflowEventType
  timestamp: string // ISO timestamp for transport-agnostic ordering
  /**
   * Human-readable content describing the event, when applicable.
   */
  content?: string
  /**
   * Optional structured metadata, small and serializable.
   * For tool events, include identifiers like toolName/toolCallId/args.
   * For llm.response, include model under `model` when available.
   * For workflow.state, include `state` (running|completed|error|timedOut).
   */
  metadata?: Record<string, unknown>
}
