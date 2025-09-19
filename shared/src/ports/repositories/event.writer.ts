import type { TxContext } from "@shared/ports/unitOfWork"

export interface EventRepository {
  /**
   * Create a Status event node.
   * Implementation should set createdAt in the persistence layer.
   */
  createStatus(
    ev: { id: string; content: string; createdAt?: Date },
    tx: TxContext
  ): Promise<void>

  /**
   * Generic create method for different event types keyed by `type`.
   * Implementations may persist additional properties based on type.
   */
  createGeneric(
    ev:
      | { id: string; type: "status"; content: string }
      | { id: string; type: "system_prompt"; content: string }
      | { id: string; type: "user_message"; content: string }
      | {
          id: string
          type: "assistant_message"
          content: string
          model?: string
        }
      | {
          id: string
          type: "tool_call"
          toolName: string
          toolCallId: string
          args: string
        }
      | {
          id: string
          type: "tool_call_result"
          toolName: string
          toolCallId: string
          content: string
        }
      | { id: string; type: "reasoning"; summary: string }
      | { id: string; type: "llm.started"; content?: string }
      | { id: string; type: "llm.completed"; content?: string },
    tx: TxContext
  ): Promise<void>

  /**
   * Append the given event to the end of the workflow chain or link from parentId when provided.
   */
  appendToWorkflowEnd(
    workflowId: string,
    eventId: string,
    parentId: string | undefined,
    tx: TxContext
  ): Promise<void>
}
