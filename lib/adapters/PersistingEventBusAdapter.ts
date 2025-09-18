import { EventBusAdapter } from "@shared/adapters/ioredis/EventBusAdapter"
import type { MessageEvent } from "@shared/entities/events/MessageEvent"
import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"

/**
 * EventBus adapter that publishes workflow/message events to Redis Streams.
 *
 * Note: Persistence to Neo4j is now handled by a separate worker that ingests
 * events from the Redis Streams. This adapter no longer writes directly to Neo4j.
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
  }
}

export default PersistingEventBusAdapter

