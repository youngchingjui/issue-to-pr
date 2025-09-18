import type {
  WorkflowEvent,
  WorkflowEventType,
} from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"

type Metadata = Record<string, unknown> | undefined

export interface WorkflowEventPublisherShape {
  emit: (
    type: WorkflowEventType,
    content?: string,
    metadata?: Metadata
  ) => void
  workflow: {
    started: (content: string, metadata?: Metadata) => void
    completed: (content?: string, metadata?: Metadata) => void
    error: (content: string, metadata?: Metadata) => void
  }
  status: (content: string, metadata?: Metadata) => void
  issue: {
    fetched: (content?: string, metadata?: Metadata) => void
  }
  llm: {
    started: (content?: string, metadata?: Metadata) => void
    completed: (content?: string, metadata?: Metadata) => void
  }
  /** Create a scoped publisher that automatically tags events with a stage. */
  scoped: (stage: string) => WorkflowEventPublisherShape
  /**
   * Convenience helper to wrap a step. Emits status started/completed and
   * captures failures as a failed status with an error message.
   */
  step: <T>(
    name: string,
    fn: (p: WorkflowEventPublisherShape) => Promise<T>
  ) => Promise<T>
}

export function createWorkflowEventPublisher(
  eventBus?: EventBusPort,
  workflowId?: string
): WorkflowEventPublisherShape {
  const safePublish = (
    type: WorkflowEventType,
    content?: string,
    metadata?: Metadata
  ) => {
    if (!eventBus || !workflowId) return
    const event: WorkflowEvent = {
      type,
      timestamp: new Date().toISOString(),
      content,
      metadata,
    }
    void eventBus.publish(workflowId, event).catch(() => {})
  }

  const makeScoped = (stage?: string): WorkflowEventPublisherShape => {
    const withStage = (meta?: Metadata) =>
      stage ? { stage, ...(meta ?? {}) } : meta

    return {
      emit: (type, content, metadata) =>
        safePublish(type, content, withStage(metadata)),
      workflow: {
        started: (content: string, metadata?: Metadata) =>
          safePublish("workflow.started", content, withStage(metadata)),
        completed: (content?: string, metadata?: Metadata) =>
          safePublish("workflow.completed", content, withStage(metadata)),
        error: (content: string, metadata?: Metadata) =>
          safePublish("workflow.error", content, withStage(metadata)),
      },
      status: (content: string, metadata?: Metadata) =>
        safePublish("status", content, withStage(metadata)),
      issue: {
        fetched: (content?: string, metadata?: Metadata) =>
          safePublish("issue.fetched", content, withStage(metadata)),
      },
      llm: {
        started: (content?: string, metadata?: Metadata) =>
          safePublish("llm.started", content, withStage(metadata)),
        completed: (content?: string, metadata?: Metadata) =>
          safePublish("llm.completed", content, withStage(metadata)),
      },
      scoped: (nextStage: string) => makeScoped(nextStage),
      step: async <T>(
        name: string,
        fn: (p: WorkflowEventPublisherShape) => Promise<T>
      ) => {
        const scopedPub = makeScoped(name)
        scopedPub.status("started")
        try {
          const res = await fn(scopedPub)
          scopedPub.status("completed")
          return res
        } catch (e) {
          scopedPub.status("failed", {
            error: e instanceof Error ? e.message : String(e),
          })
          throw e
        }
      },
    }
  }

  return makeScoped()
}

export type WorkflowEventPublisher = WorkflowEventPublisherShape

