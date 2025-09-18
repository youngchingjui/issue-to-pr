import { getRedisConnection } from "@shared/adapters/ioredis/client"
import type { AnyEvent } from "@shared/ports/events/eventBus"
import type { EventBusPort } from "@shared/ports/events/eventBus"

/**
 * Redis Streams implementation of the EventBusPort.
 *
 * Stream key convention: workflow:{workflowId}:events
 */
export class EventBusAdapter implements EventBusPort {
  constructor(
    private readonly redisUrl: string,
    private readonly maxLen = 10000
  ) {}
  private streamKeyFor(workflowId: string) {
    return `workflow:${workflowId}:events`
  }

  async publish(workflowId: string, event: AnyEvent): Promise<void> {
    const client = getRedisConnection(this.redisUrl)

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
