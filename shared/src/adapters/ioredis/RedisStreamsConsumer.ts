import { getRedisConnection } from "@shared/adapters/ioredis/client"
import { tryParseStreamEvent } from "@shared/entities/events/contracts"
import type {
  EventStreamConsumerPort,
  StreamMessage,
} from "@shared/ports/events/consumer"
import IORedis from "ioredis"

function parseEvent(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export class RedisStreamsConsumer implements EventStreamConsumerPort {
  constructor(private readonly redisUrl: string) {}

  private get client(): IORedis {
    return getRedisConnection(this.redisUrl)
  }

  async ensureGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup("CREATE", stream, group, "0", "MKSTREAM")
    } catch (err) {
      // BUSYGROUP means the group already exists – safe to ignore
      if (!(err instanceof Error && err.message.includes("BUSYGROUP"))) {
        throw err
      }
    }
  }

  async readGroup(options: {
    stream: string
    group: string
    consumer: string
    blockMs?: number
    count?: number
    onMessage: (message: StreamMessage) => Promise<void>
  }): Promise<never> {
    const { stream, group, consumer, onMessage } = options
    const blockMs = options.blockMs ?? 15_000
    const count = options.count ?? 10

    // Ensure group exists before reading
    await this.ensureGroup(stream, group)

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = (await this.client.xreadgroup(
        "GROUP",
        group,
        consumer,
        "BLOCK",
        blockMs,
        "COUNT",
        count,
        "STREAMS",
        stream,
        ">"
      )) as [string, Array<[string, Array<[string, string[]]>]>] | null

      if (!res) continue

      for (const [, entries] of res) {
        for (const [id, fields] of entries) {
          // fields is a flat array like ["event", "{...json...}", ...]
          let payload: unknown = undefined
          for (let i = 0; i < fields.length; i += 2) {
            const key = fields[i]
            const value = fields[i + 1]
            if (key === "event") {
              payload = parseEvent(value)
            }
          }

          // Validate payload shape at the transport boundary
          const validated = tryParseStreamEvent(payload)
          const msg: StreamMessage = {
            stream,
            id,
            event: validated ?? payload,
          }
          try {
            await onMessage(msg)
            await this.client.xack(stream, group, id)
          } catch (err) {
            // Do not ACK on failure; message stays pending for retry
            // Optionally we could add dead-letter handling here
            // eslint-disable-next-line no-console
            console.error("Failed to process message", { stream, id, err })
          }
        }
      }
    }
  }
}
