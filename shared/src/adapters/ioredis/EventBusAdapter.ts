import { getRedisConnection } from "@/adapters/ioredis/client"
import type { AllEvents } from "@/entities/events"
import type { EventBusPort } from "@/ports/events/eventBus"

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

  async publish(workflowId: string, event: AllEvents): Promise<void> {
    const client = getRedisConnection(this.redisUrl, "general")

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
