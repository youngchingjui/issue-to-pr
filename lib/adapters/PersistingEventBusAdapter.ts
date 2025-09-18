import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"
import { EventBusAdapter } from "@shared/adapters/ioredis/EventBusAdapter"

import {
  createErrorEvent,
  createLLMResponseEvent,
  createStatusEvent,
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

  async publish(workflowId: string, event: WorkflowEvent): Promise<void> {
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
  event: WorkflowEvent
): Promise<void> {
  const content = event.content ?? undefined

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
      await createErrorEvent({ workflowId, content: content ?? "Unknown error" })
      await createWorkflowStateEvent({ workflowId, state: "error" })
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
      if (content) {
        const model = (event.metadata?.model as string) || undefined
        await createLLMResponseEvent({ workflowId, content, model })
      } else {
        await createStatusEvent({ workflowId, content: "LLM completed" })
      }
      return
    }

    default: {
      // Unknown event type; store as status for debugging
      if (content) await createStatusEvent({ workflowId, content })
    }
  }
}

export default PersistingEventBusAdapter

