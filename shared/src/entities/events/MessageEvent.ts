/**
 * Message event types represent conversational messages exchanged in a workflow.
 * Separate from WorkflowEvent (status, tool, state changes, etc.).
 */
export type MessageEventType =
  | "system_prompt"
  | "user_message"
  | "assistant_message"

export interface MessageEvent {
  type: MessageEventType
  timestamp: string // ISO timestamp for transport-agnostic ordering
  /**
   * Message content (may later expand to structured content blocks).
   */
  content: string
  /**
   * Optional metadata, e.g. model for assistant messages.
   */
  metadata?: Record<string, unknown>
}

