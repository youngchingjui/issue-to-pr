import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"
import { getRedisConnection } from "@shared/services/redis/ioredis"

/**
 * Redis Streams implementation of the EventBusPort.
 *
 * Stream key convention: workflow:{workflowId}:events
 */
export class RedisStreamEventBusAdapter implements EventBusPort {
  private streamKeyFor(workflowId: string) {
    return `workflow:${workflowId}:events`
  }

  async publish(workflowId: string, event: WorkflowEvent): Promise<void> {
    const client = getRedisConnection()

    // XADD <key> * field value [field value ...]
    await client.xadd(
      this.streamKeyFor(workflowId),
      "*",
      "event",
      JSON.stringify(event)
    )
  }
}
