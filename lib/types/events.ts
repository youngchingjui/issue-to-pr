export type WorkflowEventType =
  | "llm_response"
  | "tool_call"
  | "tool_response"
  | "error"
  | "complete"

interface BaseWorkflowEvent {
  workflowId: string
  timestamp: Date
}

interface LLMResponseEvent extends BaseWorkflowEvent {
  type: "llm_response"
  data: {
    content: string
  }
}

interface ToolCallEvent extends BaseWorkflowEvent {
  type: "tool_call"
  data: {
    toolCalls: Array<{
      function: {
        name: string
        arguments: string
      }
    }>
  }
}

interface ToolResponseEvent extends BaseWorkflowEvent {
  type: "tool_response"
  data: {
    toolName: string
    response: string
  }
}

interface ErrorEvent extends BaseWorkflowEvent {
  type: "error"
  data: Error
}

interface CompleteEvent extends BaseWorkflowEvent {
  type: "complete"
  data: {
    content: string
  }
}

export type WorkflowEvent =
  | LLMResponseEvent
  | ToolCallEvent
  | ToolResponseEvent
  | ErrorEvent
  | CompleteEvent
