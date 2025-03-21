import { EventEmitter } from "events"

type BaseEvent = {
  timestamp: Date
  workflowId: string
  metadata?: {
    [key: string]: string | number | boolean | null | undefined
  }
}

type LLMResponseEvent = BaseEvent & {
  type: "llm_response"
  data: {
    content: string
    progress?: number
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
  data: {
    error: Error
    retryCount?: number
    recoverable?: boolean
  }
}

type CompleteEvent = BaseEvent & {
  type: "complete"
  data: {
    content: string
    success: boolean
  }
}

export type WorkflowEvent =
  | LLMResponseEvent
  | ToolCallEvent
  | ToolResponseEvent
  | ErrorEvent
  | CompleteEvent

interface WorkflowState {
  startTime: Date
  lastActivity: Date
  subscribers: Set<(event: WorkflowEvent) => void>
  status: "active" | "completed" | "error"
}

class WorkflowEventEmitter {
  private static emitter = new EventEmitter()
  private static workflowStates = new Map<string, WorkflowState>()
  private static readonly WORKFLOW_TIMEOUT = 1000 * 60 * 30 // 30 minutes
  private static cleanupInterval: NodeJS.Timeout

  static {
    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupStaleWorkflows()
      },
      1000 * 60 * 5
    ) // Check every 5 minutes
  }

  private static initWorkflow(workflowId: string) {
    if (!this.workflowStates.has(workflowId)) {
      this.workflowStates.set(workflowId, {
        startTime: new Date(),
        lastActivity: new Date(),
        subscribers: new Set(),
        status: "active",
      })
    }
  }

  private static updateWorkflowActivity(workflowId: string) {
    const state = this.workflowStates.get(workflowId)
    if (state) {
      state.lastActivity = new Date()
    }
  }

  private static cleanupStaleWorkflows() {
    const now = new Date()
    for (const [workflowId, state] of this.workflowStates.entries()) {
      const timeSinceLastActivity = now.getTime() - state.lastActivity.getTime()
      if (
        timeSinceLastActivity > this.WORKFLOW_TIMEOUT ||
        state.status === "completed"
      ) {
        // Cleanup subscribers
        state.subscribers.forEach((callback) => {
          this.emitter.off(workflowId, callback)
        })
        this.workflowStates.delete(workflowId)
      }
    }
  }

  static emit(workflowId: string, event: Omit<WorkflowEvent, "workflowId">) {
    this.initWorkflow(workflowId)
    this.updateWorkflowActivity(workflowId)

    const fullEvent = {
      ...event,
      workflowId,
      timestamp: new Date(),
    }

    // Update workflow status based on event type
    const state = this.workflowStates.get(workflowId)
    if (state) {
      if (event.type === "complete") {
        state.status = "completed"
      } else if (event.type === "error" && "recoverable" in event.data) {
        state.status = event.data.recoverable ? "active" : "error"
      }
    }

    this.emitter.emit(workflowId, fullEvent)
  }

  static subscribe(
    workflowId: string,
    callback: (event: WorkflowEvent) => void
  ) {
    this.initWorkflow(workflowId)
    const state = this.workflowStates.get(workflowId)!
    state.subscribers.add(callback)
    this.emitter.on(workflowId, callback)
  }

  static unsubscribe(
    workflowId: string,
    callback: (event: WorkflowEvent) => void
  ) {
    const state = this.workflowStates.get(workflowId)
    if (state) {
      state.subscribers.delete(callback)
      this.emitter.off(workflowId, callback)
    }
  }

  static getWorkflowStatus(workflowId: string) {
    return this.workflowStates.get(workflowId)?.status || null
  }

  // Cleanup method to be called when shutting down the application
  static cleanup() {
    clearInterval(this.cleanupInterval)
    this.workflowStates.clear()
    this.emitter.removeAllListeners()
  }
}

export default WorkflowEventEmitter
