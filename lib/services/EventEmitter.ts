import { EventEmitter } from "events"

import { isStatusEvent, StreamEvent } from "@/lib/types/events"

interface WorkflowState {
  lastActivity: Date
  subscribers: Set<(event: StreamEvent) => void>
  status: "active" | "completed" | "error"
}

class WorkflowEventEmitter extends EventEmitter {
  private workflowStates = new Map<string, WorkflowState>()
  private readonly WORKFLOW_TIMEOUT = 1000 * 60 * 30 // 30 minutes
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    super()
    this.cleanupInterval = setInterval(
      () => this.cleanupInactiveWorkflows(),
      this.WORKFLOW_TIMEOUT
    )
  }

  private initWorkflow(workflowId: string) {
    if (!this.workflowStates.has(workflowId)) {
      this.workflowStates.set(workflowId, {
        lastActivity: new Date(),
        subscribers: new Set(),
        status: "active",
      })
    }
  }

  private updateWorkflowActivity(workflowId: string) {
    const state = this.workflowStates.get(workflowId)
    if (state) {
      state.lastActivity = new Date()
    }
  }

  private cleanupInactiveWorkflows() {
    const now = new Date()
    for (const [workflowId, state] of this.workflowStates.entries()) {
      if (
        now.getTime() - state.lastActivity.getTime() >
        this.WORKFLOW_TIMEOUT
      ) {
        // Cleanup subscribers
        state.subscribers.forEach((callback) => {
          this.removeListener(workflowId, callback)
        })
        this.workflowStates.delete(workflowId)
      }
    }
  }

  emit(workflowId: string, event: Omit<StreamEvent, "workflowId">): boolean {
    this.initWorkflow(workflowId)
    this.updateWorkflowActivity(workflowId)

    const fullEvent: StreamEvent = { ...event, workflowId }

    // Update workflow status based on event type
    const state = this.workflowStates.get(workflowId)
    if (state) {
      if (isStatusEvent(event) && event.data.status === "completed") {
        state.status = "completed"
      } else if (event.type === "error") {
        state.status = "error"
      }
    }

    return super.emit(workflowId, fullEvent)
  }

  subscribe(workflowId: string, callback: (event: StreamEvent) => void) {
    this.initWorkflow(workflowId)
    const state = this.workflowStates.get(workflowId)!
    state.subscribers.add(callback)
    this.addListener(workflowId, callback)
  }

  unsubscribe(workflowId: string, callback: (event: StreamEvent) => void) {
    const state = this.workflowStates.get(workflowId)
    if (state) {
      state.subscribers.delete(callback)
      this.removeListener(workflowId, callback)
    }
  }

  getWorkflowStatus(workflowId: string) {
    return this.workflowStates.get(workflowId)?.status || null
  }

  cleanup() {
    clearInterval(this.cleanupInterval)
    this.workflowStates.clear()
    this.removeAllListeners()
  }
}

const workflowEventEmitter = new WorkflowEventEmitter()
export default workflowEventEmitter
