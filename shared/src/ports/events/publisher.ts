import type {
  WorkflowEvent,
  WorkflowEventType,
} from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"

type Metadata = Record<string, unknown> | undefined

export function createWorkflowEventPublisher(
  eventBus?: EventBusPort,
  workflowId?: string
) {
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

  return {
    emit: safePublish,
    workflow: {
      started: (content: string, metadata?: Metadata) =>
        safePublish("workflow.started", content, metadata),
      completed: (content?: string, metadata?: Metadata) =>
        safePublish("workflow.completed", content, metadata),
      error: (content: string, metadata?: Metadata) =>
        safePublish("workflow.error", content, metadata),
      state: (
        state: "running" | "completed" | "error" | "timedOut",
        content?: string
      ) => safePublish("workflow.state", content, { state }),
    },
    status: (content: string, metadata?: Metadata) =>
      safePublish("status", content, metadata),
    issue: {
      fetched: (content?: string, metadata?: Metadata) =>
        safePublish("issue.fetched", content, metadata),
    },
    message: {
      systemPrompt: (content: string, metadata?: Metadata) =>
        safePublish("system.prompt", content, metadata),
      userMessage: (content: string, metadata?: Metadata) =>
        safePublish("user.message", content, metadata),
    },
    llm: {
      started: (content?: string, metadata?: Metadata) =>
        safePublish("llm.started", content, metadata),
      completed: (content?: string, metadata?: Metadata) =>
        safePublish("llm.completed", content, metadata),
      response: (content: string, model?: string) =>
        safePublish("llm.response", content, model ? { model } : undefined),
    },
    tool: {
      call: (
        toolName: string,
        toolCallId: string,
        args: string,
        metadata?: Metadata
      ) =>
        safePublish("tool.call", undefined, {
          toolName,
          toolCallId,
          args,
          ...(metadata || {}),
        }),
      result: (
        toolName: string,
        toolCallId: string,
        content: string,
        metadata?: Metadata
      ) =>
        safePublish("tool.result", content, {
          toolName,
          toolCallId,
          ...(metadata || {}),
        }),
    },
    reasoning: (summary: string) => safePublish("reasoning", summary),
  } as const
}

export type WorkflowEventPublisher = ReturnType<
  typeof createWorkflowEventPublisher
>
