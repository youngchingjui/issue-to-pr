import { getRedisConnection } from "@shared/adapters/ioredis/client"
import { ensureTimestamp } from "@shared/entities/events/contracts"
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

    const payload = ensureTimestamp(event as { timestamp?: string })
    await client.xadd(
      this.streamKeyFor(workflowId),
      "MAXLEN",
      "~",
      String(this.maxLen),
      "*",
      "event",
      JSON.stringify(payload)
    )
  }
}
