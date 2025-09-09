import type { WorkflowEvent } from "@shared/entities/events/WorkflowEvent"
import type { EventBusPort } from "@shared/ports/events/eventBus"
import { getRedisConnection } from "@shared/services/redis/ioredis"

/**
 * Redis Streams implementation of the EventBusPort.
 *
 * Stream key convention: workflow:{workflowId}:events
 */
export class RedisStreamEventBusAdapter implements EventBusPort {
  constructor(private readonly maxLen = 10000) {}
  private streamKeyFor(workflowId: string) {
    return `workflow:${workflowId}:events`
  }

  async publish(workflowId: string, event: WorkflowEvent): Promise<void> {
    const client = getRedisConnection()

    await client.xadd(
      this.streamKeyFor(workflowId),
      "MAXLEN",
      "~",
      String(this.maxLen),
      "*",
      "event",
      JSON.stringify(event)
    )
  }
}
