import { ensureTimestamp } from "@shared/entities/events/contracts"
import { type AnyEventType } from "@shared/entities/events/Event"
import {
  type Metadata,
  type WorkflowId,
} from "@shared/entities/events/WorkflowEvent"
import { EventPublisherPort } from "@shared/ports/events/publisher"
import Redis from "ioredis"

export class EventPublisherAdapter implements EventPublisherPort {
  constructor(
    private readonly client: Redis,
    private readonly maxLen = 10000
  ) {}

  private streamKeyFor(workflowId: string) {
    return `workflow:${workflowId}:events`
  }

  emit(
    type: AnyEventType,
    workflowId: WorkflowId,
    content?: string,
    metadata?: Metadata
  ): void {
    const event = ensureTimestamp({ type, content, metadata })
    this.client.xadd(
      this.streamKeyFor(workflowId),
      "MAXLEN",
      "~",
      String(this.maxLen),
      "*",
      "event",
      JSON.stringify(event)
    )
  }

  workflow: EventPublisherPort["workflow"] = {
    started: (workflowId, content, metadata) => {
      this.emit("workflow.started", workflowId, content, metadata)
    },
    completed: (workflowId: WorkflowId, content, metadata) => {
      this.emit("workflow.completed", workflowId, content, metadata)
    },
    error: (workflowId: WorkflowId, content: string, metadata?: Metadata) => {
      this.emit("workflow.error", workflowId, content, metadata)
    },
  }

  status: EventPublisherPort["status"] = (workflowId, content, metadata) => {
    this.emit("status", workflowId, content, metadata)
  }

  issue: EventPublisherPort["issue"] = {
    fetched: (workflowId, content, metadata) => {
      this.emit("issue.fetched", workflowId, content, metadata)
    },
  }

  message: EventPublisherPort["message"] = {
    systemPrompt: (workflowId, content, metadata) => {
      this.emit("system_prompt", workflowId, content, metadata)
    },
    userMessage: (workflowId, content, metadata) => {
      this.emit("user_message", workflowId, content, metadata)
    },
    assistantMessage: (workflowId, content, model, metadata) => {
      const event = ensureTimestamp({
        type: "assistant_message" as const,
        content,
        model,
        metadata,
      })
      this.client.xadd(
        this.streamKeyFor(workflowId),
        "MAXLEN",
        "~",
        String(this.maxLen),
        "*",
        "event",
        JSON.stringify(event)
      )
    },
    toolCall: (workflowId, toolName, toolCallId, args, metadata) => {
      const event = ensureTimestamp({
        type: "tool_call" as const,
        toolName,
        toolCallId,
        args,
        metadata,
      })
      this.client.xadd(
        this.streamKeyFor(workflowId),
        "MAXLEN",
        "~",
        String(this.maxLen),
        "*",
        "event",
        JSON.stringify(event)
      )
    },
    toolCallResult: (workflowId, toolName, toolCallId, content, metadata) => {
      const event = ensureTimestamp({
        type: "tool_call_result" as const,
        toolName,
        toolCallId,
        content,
        metadata,
      })
      this.client.xadd(
        this.streamKeyFor(workflowId),
        "MAXLEN",
        "~",
        String(this.maxLen),
        "*",
        "event",
        JSON.stringify(event)
      )
    },
    reasoning: (workflowId, summary, metadata) => {
      this.emit("reasoning", workflowId, summary, metadata)
    },
  }

  llm: EventPublisherPort["llm"] = {
    started: (workflowId, content, metadata) => {
      this.emit("llm.started", workflowId, content, metadata)
    },
    completed: (workflowId, content, metadata) => {
      this.emit("llm.completed", workflowId, content, metadata)
    },
  }
}
