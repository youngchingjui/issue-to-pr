import { type AnyEvent, type AnyEventType } from "@shared/entities/events/Event"
import {
  type Metadata,
  type WorkflowId,
} from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"

export function createWorkflowEventPublisher(
  eventBus?: EventBusPort,
  workflowId?: string
) {
  const safePublish = (
    type: AnyEventType,
    content?: string,
    metadata?: Metadata
  ) => {
    if (!eventBus || !workflowId) return
    const event: AnyEvent = {
      type,
      timestamp: new Date().toISOString(),
      ...(content !== undefined ? { content } : {}),
      ...(metadata ? { metadata } : {}),
    } as AnyEvent
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
        safePublish("system_prompt", content, metadata),
      userMessage: (content: string, metadata?: Metadata) =>
        safePublish("user_message", content, metadata),
      assistantMessage: (content: string, model?: string) =>
        safePublish(
          "assistant_message",
          content,
          model ? { model } : undefined
        ),
    },
    llm: {
      started: (content?: string, metadata?: Metadata) =>
        safePublish("llm.started", content, metadata),
      completed: (content?: string, metadata?: Metadata) =>
        safePublish("llm.completed", content, metadata),
    },
    tool: {
      call: (
        toolName: string,
        toolCallId: string,
        args: string,
        metadata?: Metadata
      ) =>
        safePublish("tool_call", undefined, {
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
        safePublish("tool_call_result", content, {
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

/**
 * Port for emitting events to an event bus.
 */
export interface EventPublisherPort {
  /**
   * Emit any event to the event bus.
   */
  emit: (
    type: AnyEventType,
    workflowId: WorkflowId,
    content?: string,
    metadata?: Metadata
  ) => void

  /**
   * Emit workflow events to the event bus.
   */
  workflow: {
    started: (
      workflowId: WorkflowId,
      content: string,
      metadata?: Metadata
    ) => void
    completed: (
      workflowId: WorkflowId,
      content?: string,
      metadata?: Metadata
    ) => void
    error: (
      workflowId: WorkflowId,
      content: string,
      metadata?: Metadata
    ) => void
  }

  /**
   * Emit status events to the event bus.
   */
  status: (workflowId: WorkflowId, content: string, metadata?: Metadata) => void

  /**
   * Emit issue-related events to the event bus.
   */
  issue: {
    fetched: (
      workflowId: WorkflowId,
      content?: string,
      metadata?: Metadata
    ) => void
  }

  /**
   * Emit message-related events to the event bus.
   */
  message: {
    systemPrompt: (
      workflowId: WorkflowId,
      content: string,
      metadata?: Metadata
    ) => void
    userMessage: (
      workflowId: WorkflowId,
      content: string,
      metadata?: Metadata
    ) => void
    assistantMessage: (
      workflowId: WorkflowId,
      content: string,
      model?: string,
      metadata?: Metadata
    ) => void
    toolCall: (
      workflowId: WorkflowId,
      toolName: string,
      toolCallId: string,
      args: string,
      metadata?: Metadata
    ) => void
    toolCallResult: (
      workflowId: WorkflowId,
      toolName: string,
      toolCallId: string,
      content: string,
      metadata?: Metadata
    ) => void
    reasoning: (
      workflowId: WorkflowId,
      summary: string,
      metadata?: Metadata
    ) => void
  }

  /**
   * Emit LLM-related events to the event bus.
   */
  llm: {
    started: (
      workflowId: WorkflowId,
      content?: string,
      metadata?: Metadata
    ) => void
    completed: (
      workflowId: WorkflowId,
      content?: string,
      metadata?: Metadata
    ) => void
  }
}

export function withWorkflowId(
  pub: EventPublisherPort,
  workflowId: WorkflowId
) {
  return {
    ...pub,
    workflow: {
      started: (content: string, metadata?: Metadata) =>
        pub.workflow.started(workflowId, content, metadata),
      completed: (content?: string, metadata?: Metadata) =>
        pub.workflow.completed(workflowId, content, metadata),
      error: (content: string, metadata?: Metadata) =>
        pub.workflow.error(workflowId, content, metadata),
    },
    status: (content: string, metadata?: Metadata) =>
      pub.status(workflowId, content, metadata),
    issue: {
      fetched: (content?: string, metadata?: Metadata) =>
        pub.issue.fetched(workflowId, content, metadata),
    },
    message: {
      systemPrompt: (content: string, metadata?: Metadata) =>
        pub.message.systemPrompt(workflowId, content, metadata),
      userMessage: (content: string, metadata?: Metadata) =>
        pub.message.userMessage(workflowId, content, metadata),
      assistantMessage: (
        content: string,
        model?: string,
        metadata?: Metadata
      ) => pub.message.assistantMessage(workflowId, content, model, metadata),
      toolCall: (
        toolName: string,
        toolCallId: string,
        args: string,
        metadata?: Metadata
      ) =>
        pub.message.toolCall(workflowId, toolName, toolCallId, args, metadata),
      toolCallResult: (
        toolName: string,
        toolCallId: string,
        content: string,
        metadata?: Metadata
      ) =>
        pub.message.toolCallResult(
          workflowId,
          toolName,
          toolCallId,
          content,
          metadata
        ),
      reasoning: (summary: string, metadata?: Metadata) =>
        pub.message.reasoning(workflowId, summary, metadata),
    },
    llm: {
      started: (content?: string, metadata?: Metadata) =>
        pub.llm.started(workflowId, content, metadata),
      completed: (content?: string, metadata?: Metadata) =>
        pub.llm.completed(workflowId, content, metadata),
    },
  }
}
