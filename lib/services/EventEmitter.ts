import { EventEmitter } from "events"

type BaseEvent = {
  timestamp: Date
  workflowId: string
}

type LLMResponseEvent = BaseEvent & {
  type: "llm_response"
  data: {
    content: string
  }
}

type ToolCallEvent = BaseEvent & {
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

type ToolResponseEvent = BaseEvent & {
  type: "tool_response"
  data: {
    toolName: string
    response: string
  }
}

type ErrorEvent = BaseEvent & {
  type: "error"
  data: Error
}

type CompleteEvent = BaseEvent & {
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

class WorkflowEventEmitter {
  private static emitter = new EventEmitter()

  static emit(workflowId: string, event: Omit<WorkflowEvent, "workflowId">) {
    this.emitter.emit(workflowId, {
      ...event,
      workflowId,
      timestamp: new Date(),
    })
  }

  static subscribe(
    workflowId: string,
    callback: (event: WorkflowEvent) => void
  ) {
    this.emitter.on(workflowId, callback)
  }

  static unsubscribe(
    workflowId: string,
    callback: (event: WorkflowEvent) => void
  ) {
    this.emitter.off(workflowId, callback)
  }
}

export default WorkflowEventEmitter
