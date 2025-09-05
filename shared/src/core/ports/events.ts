export type CoreWorkflowEventType =
  | "workflow_start"
  | "system_prompt"
  | "user_message"
  | "llm_response"
  | "tool_call"
  | "tool_response"
  | "error"
  | "status"
  | "reasoning"

export interface CoreWorkflowEvent<T = unknown> {
  type: CoreWorkflowEventType
  data: T
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface EventPort {
  emit(workflowId: string, event: CoreWorkflowEvent): Promise<void> | void
}

