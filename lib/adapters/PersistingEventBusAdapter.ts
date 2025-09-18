import { EventBusAdapter } from "@shared/adapters/ioredis/EventBusAdapter"
import type { MessageEvent } from "@shared/entities/events/MessageEvent"
import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"

import {
  createErrorEvent,
  createLLMResponseEvent,
  createReasoningEvent,
  createStatusEvent,
  createSystemPromptEvent,
  createToolCallEvent,
  createToolCallResultEvent,
  createUserResponseEvent,
  createWorkflowStateEvent,
} from "@/lib/neo4j/services/event"

/**
 * EventBus adapter that both publishes to the transport (Redis Streams)
 * and persists events into Neo4j as they occur.
 */
export class PersistingEventBusAdapter implements EventBusPort {
  private readonly bus?: EventBusAdapter

  constructor(private readonly redisUrl?: string) {
    this.bus = redisUrl ? new EventBusAdapter(redisUrl) : undefined
  }

  async publish(
    workflowId: string,
    event: WorkflowEvent | MessageEvent
  ): Promise<void> {
    // Fire-and-forget publish to the bus if configured
    if (this.bus) {
      this.bus.publish(workflowId, event).catch(() => {})
    }

    // Persist into Neo4j
    await persistToNeo4j(workflowId, event)
  }
}

async function persistToNeo4j(
  workflowId: string,
  event: WorkflowEvent | MessageEvent
): Promise<void> {
  const content = event.content ?? undefined
  const metadata = event.metadata

  switch (event.type) {
    case "workflow.started": {
      await createWorkflowStateEvent({ workflowId, state: "running" })
      if (content) await createStatusEvent({ workflowId, content })
      return
    }

    case "workflow.completed": {
      if (content) await createStatusEvent({ workflowId, content })
      await createWorkflowStateEvent({ workflowId, state: "completed" })
      return
    }

    case "workflow.error": {
      await createErrorEvent({
        workflowId,
        content: content ?? "Unknown error",
      })
      await createWorkflowStateEvent({ workflowId, state: "error" })
      return
    }

    case "workflow.state": {
      const state =
        (metadata?.["state"] as
          | "running"
          | "completed"
          | "error"
          | "timedOut"
          | undefined) ?? "running"
      await createWorkflowStateEvent({ workflowId, state, content })
      return
    }

    case "status": {
      if (content) await createStatusEvent({ workflowId, content })
      return
    }

    case "llm.started": {
      // For now, track as a status event for visibility
      await createStatusEvent({
        workflowId,
        content: content ?? "LLM started",
      })
      return
    }

    case "llm.completed": {
      await createStatusEvent({
        workflowId,
        content: content ?? "LLM completed",
      })
      return
    }

    // Message events
    case "system_prompt": {
      if (!content) return
      await createSystemPromptEvent({ workflowId, content })
      return
    }

    case "user_message": {
      if (!content) return
      await createUserResponseEvent({ workflowId, content })
      return
    }

    case "assistant_message": {
      if (!content) return
      await createLLMResponseEvent({
        workflowId,
        content,
        model: (metadata?.["model"] as string) || undefined,
      })
      return
    }

    case "tool.call": {
      const toolName = (metadata?.["toolName"] as string) || "unknown"
      const toolCallId = (metadata?.["toolCallId"] as string) || ""
      const args = JSON.stringify(metadata?.["args"] || {})
      await createToolCallEvent({
        workflowId,
        toolName,
        toolCallId,
        args,
      })
      return
    }

    case "tool.result": {
      const toolName = (metadata?.["toolName"] as string) || "unknown"
      const toolCallId = (metadata?.["toolCallId"] as string) || ""
      await createToolCallResultEvent({
        workflowId,
        toolName,
        toolCallId,
        content: content ?? "",
      })
      return
    }

    case "reasoning": {
      // prefer metadata.summary if provided, else use content
      const summary = (metadata?.["summary"] as string) || content || ""
      await createReasoningEvent({ workflowId, summary })
      return
    }

    default: {
      // Unknown event type; store as status for debugging
      if (content) await createStatusEvent({ workflowId, content })
    }
  }
}

export default PersistingEventBusAdapter
