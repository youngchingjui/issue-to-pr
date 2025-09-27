import { v4 as uuidv4 } from "uuid"

import { AllEvents } from "@/entities/events"
import type { EventBusPort } from "@/ports/events/eventBus"

type Metadata = Record<string, unknown> | undefined

export function createWorkflowEventPublisher(
  eventBus?: EventBusPort,
  workflowId?: string
) {
  const publish = (event: AllEvents) => {
    if (!eventBus || !workflowId) return
    void eventBus.publish(workflowId, event).catch(() => {})
  }

  const nowIso = () => new Date().toISOString()
  const nowDate = () => new Date()
  const newId = () => uuidv4()

  return {
    // Accept a fully formed event if the caller wants to construct it explicitly
    emit: (event: AllEvents) => publish(event),

    workflow: {
      started: (content?: string) =>
        publish({
          type: "workflow.started",
          id: newId(),
          timestamp: nowDate(),
          ...(content ? { content } : {}),
        }),
      completed: (content?: string) =>
        publish({
          type: "workflow.completed",
          id: newId(),
          timestamp: nowDate(),
          ...(content ? { content } : {}),
        }),
      error: (message: string) =>
        publish({
          type: "workflow.error",
          id: newId(),
          timestamp: nowDate(),
          message,
        }),
      state: (
        state: "running" | "completed" | "error" | "timedOut",
        content?: string
      ) =>
        publish({
          type: "workflow.state",
          id: newId(),
          timestamp: nowDate(),
          state,
          ...(content ? { content } : {}),
        }),
      status: (content: string) =>
        publish({
          type: "status",
          id: newId(),
          timestamp: nowDate(),
          content,
        }),
    },

    github: {
      issue: {
        // metadata param kept for backward compatibility but ignored to match schema
        fetched: (content?: string, _metadata?: Metadata) =>
          publish({
            type: "issue.fetched",
            id: newId(),
            timestamp: nowDate(),
            ...(content ? { content } : {}),
          }),
      },
    },

    message: {
      systemPrompt: (content: string, metadata?: Metadata) =>
        publish({
          type: "system_prompt",
          timestamp: nowIso(),
          content,
          ...(metadata ? { metadata } : {}),
        }),
      userMessage: (content: string, metadata?: Metadata) =>
        publish({
          type: "user_message",
          timestamp: nowIso(),
          content,
          ...(metadata ? { metadata } : {}),
        }),
      assistantMessage: (content: string, model?: string) =>
        publish({
          type: "assistant_message",
          timestamp: nowIso(),
          content,
          ...(model ? { metadata: { model } } : {}),
        }),
      toolCall: (content: string, metadata?: Metadata) =>
        publish({
          type: "tool.call",
          timestamp: nowIso(),
          content,
          ...(metadata ? { metadata } : {}),
        }),
      toolResult: (content: string, metadata?: Metadata) =>
        publish({
          type: "tool.result",
          timestamp: nowIso(),
          content,
          ...(metadata ? { metadata } : {}),
        }),
      reasoning: (content: string) =>
        publish({
          type: "reasoning",
          timestamp: nowIso(),
          content,
        }),
    },

    llm: {
      started: (content?: string) =>
        publish({
          type: "llm.started",
          id: newId(),
          timestamp: nowIso(),
          ...(content ? { content } : {}),
        }),
      completed: (content?: string) =>
        publish({
          type: "llm.completed",
          id: newId(),
          timestamp: nowIso(),
          ...(content ? { content } : {}),
        }),
    },
  } as const
}

export type WorkflowEventPublisher = ReturnType<
  typeof createWorkflowEventPublisher
>
