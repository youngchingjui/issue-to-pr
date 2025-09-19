export interface StreamMessage<T = unknown> {
  stream: string
  id: string
  event: T
}

export interface EventStreamConsumerPort {
  /**
   * Ensure a consumer group exists for the given stream.
   * Should be idempotent (no-op if group already exists).
   */
  ensureGroup(stream: string, group: string): Promise<void>

  /**
   * Continuously read from the stream as part of a consumer group and
   * invoke the callback for each message. Implementations should ACK
   * messages upon successful processing by the callback.
   */
  readGroup(options: {
    stream: string
    group: string
    consumer: string
    blockMs?: number
    count?: number
    onMessage: (message: StreamMessage) => Promise<void>
  }): Promise<never>
}
