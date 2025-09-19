/**
 * Message event types represent conversational messages exchanged in a workflow.
 * Separate from WorkflowEvent (status, tool, state changes, etc.).
 */
export type MessageEventType =
  | "system_prompt"
  | "user_message"
  | "assistant_message"
  | "tool_call"
  | "tool_call_result"
  | "reasoning"

export interface MessageEvent {
  type: MessageEventType
  timestamp: string // ISO timestamp for transport-agnostic ordering
  /**
   * Message content (may later expand to structured content blocks).
   */
  content: Content
  /**
   * Optional metadata, e.g. model for assistant messages.
   */
  metadata?: Record<string, unknown>
}

// TODO: Expand this definition to be an object that can incorporate many things.
// Like text, image URLs. Also should include more metadata like role, etc.
export type Content =
  | string
  | {
      type: "text"
      text: string
    }
  | {
      type: "image"
      image_url: string
    }
  | {
      type: "file"
      file_url: string
    }
  | { type: "audio"; audio: { data: string; format: "mp3" | "wav" } }
