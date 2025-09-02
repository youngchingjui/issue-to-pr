import type { WorkflowReporter } from "@shared/core/ports/events"

import workflowEventEmitter from "@/lib/services/EventEmitter"
import {
  createErrorEvent,
  createStatusEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"

/**
 * Adapter that bridges the shared WorkflowReporter port to our Neo4j-backed
 * event store and in-memory streaming bus.
 */
export class Neo4jWorkflowReporter implements WorkflowReporter {
  constructor(private readonly workflowId: string, private readonly scope?: string) {}

  private withScope(message?: string) {
    if (!message) return undefined
    return this.scope ? `[${this.scope}] ${message}` : message
  }

  async start(message?: string): Promise<void> {
    await createWorkflowStateEvent({ workflowId: this.workflowId, state: "running" })
    if (message) await this.status(message)
  }

  async status(message: string): Promise<void> {
    const content = this.withScope(message)!
    await createStatusEvent({ workflowId: this.workflowId, content })
    workflowEventEmitter.emit(this.workflowId, {
      type: "status",
      data: { status: content },
      timestamp: new Date(),
    })
  }

  async info(message: string): Promise<void> {
    // For now we map info to status to reduce event types in the UI
    await this.status(message)
  }

  async warn(message: string): Promise<void> {
    // Use a simple [WARNING] prefix to keep UI consistent
    await this.status(`[WARNING]: ${message}`)
  }

  async complete(message?: string): Promise<void> {
    await createWorkflowStateEvent({ workflowId: this.workflowId, state: "completed" })
    if (message) await this.status(message)
  }

  async error(message: string): Promise<void> {
    const content = this.withScope(message)!
    await createErrorEvent({ workflowId: this.workflowId, content })
    await createWorkflowStateEvent({ workflowId: this.workflowId, state: "error", content })
    workflowEventEmitter.emit(this.workflowId, {
      type: "error",
      data: { error: content },
      timestamp: new Date(),
    })
  }

  child(scope: string): WorkflowReporter {
    return new Neo4jWorkflowReporter(this.workflowId, scope)
  }
}

