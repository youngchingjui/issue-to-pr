import type Redis from "ioredis"

/**
 * Capability-specific port for obtaining a native ioredis client.
 * Use this when an adapter (e.g., BullMQ) requires direct access to ioredis.
 */
export interface IORedisPort {
  /**
   * Get the underlying ioredis client instance.
   */
  getIORedisClient(): Promise<Redis>
}
