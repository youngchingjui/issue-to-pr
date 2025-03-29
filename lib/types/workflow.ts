export type WorkflowEventType =
  | "workflow_start"
  | "system_prompt"
  | "user_message"
  | "llm_response"
  | "tool_call"
  | "tool_response"
  | "error"
  | "complete"
  | "status"

export interface SystemPromptData {
  content: string
}

export interface UserMessageData {
  content: string
}

export interface LLMResponseData {
  content: string
  model: string
}

export interface ToolCallData {
  toolName: string
  arguments: Record<string, unknown>
}

export interface ToolResponseData {
  toolName: string
  response: unknown
}

export interface ErrorData {
  error: string | Error
  recoverable?: boolean
  retryCount?: number
  toolName?: string
}

export interface StatusData {
  status: string
  success?: boolean
}

export type WorkflowEventData =
  | SystemPromptData
  | UserMessageData
  | LLMResponseData
  | ToolCallData
  | ToolResponseData
  | ErrorData
  | StatusData

export interface WorkflowEvent {
  type: WorkflowEventType
  workflowId: string
  data: WorkflowEventData
  timestamp: Date
}
