import type Redis from "ioredis"

export interface RedisPort {
  /**
   * Get a Redis connection for use with BullMQ
   * @returns Promise that resolves to a Redis connection object
   */
  getConnection(): Promise<Redis>

  /**
   * Close the Redis connection
   * @returns Promise that resolves when connection is closed
   */
  close(): Promise<void>

  /**
   * Check if the Redis connection is healthy
   * @returns Promise that resolves to true if connection is healthy
   */
  isHealthy(): Promise<boolean>
}
