import { SystemClock } from "@shared/adapters/clock/SystemClock"
import { RandomUUIDGenerator } from "@shared/adapters/id/RandomUUIDGenerator"
import { EventBusAdapter } from "@shared/adapters/ioredis/EventBusAdapter"
import { createNeo4jUnitOfWork } from "@shared/adapters/neo4j/Neo4jUnitOfWork"
import type { MessageEvent } from "@shared/entities/events/MessageEvent"
import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"
import { CreateStatusEventUseCase } from "@shared/usecases/events/createStatusEvent"

import {
  createErrorEvent,
  createLLMResponseEvent,
  createReasoningEvent,
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
  private readonly createStatusUC: CreateStatusEventUseCase

  constructor(private readonly redisUrl?: string) {
    this.bus = redisUrl ? new EventBusAdapter(redisUrl) : undefined

    // Wire ports/adapters for the status event use-case (ports & adapters style)
    const uri = process.env.NEO4J_URI || "bolt://localhost:7687"
    const user = process.env.NEO4J_USER || "neo4j"
    const password = process.env.NEO4J_PASSWORD || "password"
    const uow = createNeo4jUnitOfWork({ uri, user, password })
    const ids = new RandomUUIDGenerator()
    const clock = new SystemClock()
    this.createStatusUC = new CreateStatusEventUseCase(uow, ids, clock)
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
    await this.persistToNeo4j(workflowId, event)
  }

  private async persistToNeo4j(
    workflowId: string,
    event: WorkflowEvent | MessageEvent
  ): Promise<void> {
    const content = event.content ?? undefined
    const metadata = event.metadata

    switch (event.type) {
      case "workflow.started": {
        await createWorkflowStateEvent({ workflowId, state: "running" })
        if (content) await this.createStatusUC.exec({ workflowId, content })
        return
      }

      case "workflow.completed": {
        if (content) await this.createStatusUC.exec({ workflowId, content })
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
        if (content) await this.createStatusUC.exec({ workflowId, content })
        return
      }

      case "llm.started": {
        // For now, track as a status event for visibility
        await this.createStatusUC.exec({
          workflowId,
          content: content ?? "LLM started",
        })
        return
      }

      case "llm.completed": {
        await this.createStatusUC.exec({
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
        if (content) await this.createStatusUC.exec({ workflowId, content })
      }
    }
  }
}

export default PersistingEventBusAdapter
