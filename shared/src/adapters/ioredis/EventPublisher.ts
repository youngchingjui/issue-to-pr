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
    this.client.xadd(
      this.streamKeyFor(workflowId),
      "MAXLEN",
      "~",
      String(this.maxLen),
      "*",
      "event",
      JSON.stringify({ workflowId, type, content, metadata })
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
      this.client.xadd(
        this.streamKeyFor(workflowId),
        "MAXLEN",
        "~",
        String(this.maxLen),
        "*",
        "event",
        JSON.stringify({
          workflowId,
          type: "assistant_message",
          content,
          model,
          metadata,
        })
      )
    },
    toolCall: (workflowId, toolName, toolCallId, args, metadata) => {
      this.client.xadd(
        this.streamKeyFor(workflowId),
        "MAXLEN",
        "~",
        String(this.maxLen),
        "*",
        "event",
        JSON.stringify({
          workflowId,
          type: "tool_call",
          toolName,
          toolCallId,
          args,
          metadata,
        })
      )
    },
    toolCallResult: (workflowId, toolName, toolCallId, content, metadata) => {
      this.client.xadd(
        this.streamKeyFor(workflowId),
        "MAXLEN",
        "~",
        String(this.maxLen),
        "*",
        "event",
        JSON.stringify({
          workflowId,
          type: "tool_call_result",
          toolName,
          toolCallId,
          content,
          metadata,
        })
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
