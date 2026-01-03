import { EventBusAdapter } from "shared/adapters/ioredis/EventBusAdapter"
import type { AllEvents } from "shared/entities/events/index"
import type { EventBusPort } from "shared/ports/events/eventBus"

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
import { upsertCreatedPullRequestFromToolResult } from "@/lib/neo4j/services/pullRequest"

/**
 * EventBus adapter that both publishes to the transport (Redis Streams)
 * and persists events into Neo4j as they occur.
 */
export class PersistingEventBusAdapter implements EventBusPort {
  private readonly bus?: EventBusAdapter

  constructor(private readonly redisUrl?: string) {
    this.bus = redisUrl ? new EventBusAdapter(redisUrl) : undefined
  }

  async publish(workflowId: string, event: AllEvents): Promise<void> {
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
  event: AllEvents
): Promise<void> {
  switch (event.type) {
    case "workflow.started": {
      await createWorkflowStateEvent({ workflowId, state: "running" })
      return
    }

    case "workflow.completed": {
      await createWorkflowStateEvent({ workflowId, state: "completed" })
      return
    }

    case "workflow.error": {
      await createErrorEvent({
        workflowId,
        content: event.message,
      })
      await createWorkflowStateEvent({ workflowId, state: "error" })
      return
    }

    case "workflow.state": {
      await createWorkflowStateEvent({
        workflowId,
        state: event.state === "pending" ? "running" : event.state, // Temp fix as we slowly migrate to using entities and types from shared folder
        content: event.content,
      })
      return
    }

    case "status": {
      await createStatusEvent({ workflowId, content: event.content })
      return
    }

    case "llm.started": {
      // For now, track as a status event for visibility
      await createStatusEvent({
        workflowId,
        content: event.content ?? "LLM started",
      })
      return
    }

    case "llm.completed": {
      await createStatusEvent({
        workflowId,
        content: event.content ?? "LLM completed",
      })
      return
    }

    // Message events
    case "system_prompt": {
      await createSystemPromptEvent({ workflowId, content: event.content })
      return
    }

    case "user_message": {
      await createUserResponseEvent({ workflowId, content: event.content })
      return
    }

    case "assistant_message": {
      await createLLMResponseEvent({
        workflowId,
        content: event.content,
        model: (event.metadata?.["model"] as string) || undefined,
      })
      return
    }

    case "tool.call": {
      const toolName = (event.metadata?.["toolName"] as string) || "unknown"
      const toolCallId = (event.metadata?.["toolCallId"] as string) || ""
      const args = JSON.stringify(event.metadata?.["args"] || {})
      await createToolCallEvent({
        workflowId,
        toolName,
        toolCallId,
        args,
      })
      return
    }

    case "tool.result": {
      const toolName = (event.metadata?.["toolName"] as string) || "unknown"
      const toolCallId = (event.metadata?.["toolCallId"] as string) || ""
      const created = await createToolCallResultEvent({
        workflowId,
        toolName,
        toolCallId,
        content: event.content ?? "",
      })

      // Normalize agent-created PRs into first-class nodes
      if (toolName === "create_pull_request") {
        try {
          const parsed = JSON.parse(event.content || "{}")
          const pr = parsed?.pullRequest?.data
          if (parsed?.status === "success" && pr?.number && pr?.url) {
            const number = Number(pr.number)
            const url = String(pr.url)
            const title = pr?.title ? String(pr.title) : undefined
            await upsertCreatedPullRequestFromToolResult({
              eventId: created.id,
              url,
              number,
              title,
            })
          }
        } catch {
          // ignore parse errors – content may be arbitrary
        }
      }

      return
    }

    case "reasoning": {
      await createReasoningEvent({ workflowId, summary: event.content })
      return
    }

    default: {
      // Unknown event type; store as status for debugging
      await createStatusEvent({ workflowId, content: event.content ?? "" })
      return
    }
  }
}

export default PersistingEventBusAdapter
