export interface SystemPromptData {
  content: string
}

export interface UserMessageData {
  content: string
}

export interface LLMResponseData {
  content: string
  model?: string
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

export type WorkflowEventType =
  | "workflow_start"
  | "system_prompt"
  | "user_message"
  | "llm_response"
  | "tool_call"
  | "tool_response"
  | "error"
  | "status"

export type WorkflowEventData =
  | SystemPromptData
  | UserMessageData
  | LLMResponseData
  | ToolCallData
  | ToolResponseData
  | ErrorData
  | StatusData

interface BaseEventFields {
  id: string
  workflowId: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface WorkflowStartEvent extends BaseEventFields {
  type: "workflow_start"
  data: Record<string, never>
}

export interface SystemPromptEvent extends BaseEventFields {
  type: "system_prompt"
  data: SystemPromptData
}

export interface UserMessageEvent extends BaseEventFields {
  type: "user_message"
  data: UserMessageData
}

export interface LLMResponseEvent extends BaseEventFields {
  type: "llm_response"
  data: LLMResponseData
}

export interface ToolCallEvent extends BaseEventFields {
  type: "tool_call"
  data: ToolCallData
}

export interface ToolResponseEvent extends BaseEventFields {
  type: "tool_response"
  data: ToolResponseData
}

export interface ErrorEvent extends BaseEventFields {
  type: "error"
  data: ErrorData
}

export interface StatusEvent extends BaseEventFields {
  type: "status"
  data: StatusData
}

export type WorkflowEvent =
  | WorkflowStartEvent
  | SystemPromptEvent
  | UserMessageEvent
  | LLMResponseEvent
  | ToolCallEvent
  | ToolResponseEvent
  | ErrorEvent
  | StatusEvent

export interface WorkflowWithEvents {
  id: string
  events: WorkflowEvent[]
  status: "active" | "completed" | "error"
  lastEventTimestamp: Date | null
  metadata?: WorkflowMetadata
  issue?: { number: number; repoFullName: string }
}

export interface WorkflowMetadata {
  workflowType: string
  postToGithub: boolean
}
