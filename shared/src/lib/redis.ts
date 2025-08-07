import type { RedisPort, RedisConnection } from "@/core/ports/RedisPort.js"

/**
 * Redis service that follows clean architecture principles
 * This service works only with ports and doesn't import any adapters
 */
export class RedisService {
  constructor(private readonly redisPort: RedisPort) {}

  /**
   * Get a Redis connection
   * @returns Promise that resolves to a Redis connection
   */
  async getConnection(): Promise<RedisConnection> {
    return await this.redisPort.getConnection()
  }

  /**
   * Check if the Redis connection is healthy
   * @returns Promise that resolves to true if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    return await this.redisPort.isHealthy()
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.redisPort.close()
  }

  /**
   * Ping the Redis server
   * @returns Promise that resolves to "PONG" if successful
   */
  async ping(): Promise<string> {
    const connection = await this.getConnection()
    return await connection.ping()
  }

  /**
   * Get a value from Redis
   * @param key The key to get
   * @returns Promise that resolves to the value or null if not found
   */
  async get(key: string): Promise<string | null> {
    const connection = await this.getConnection()
    return await connection.get(key)
  }

  /**
   * Set a value in Redis
   * @param key The key to set
   * @param value The value to set
   * @param ttl Optional time-to-live in seconds
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const connection = await this.getConnection()
    await connection.set(key, value, ttl)
  }

  /**
   * Delete a key from Redis
   * @param key The key to delete
   * @returns Promise that resolves to the number of keys deleted
   */
  async del(key: string): Promise<number> {
    const connection = await this.getConnection()
    return await connection.del(key)
  }

  /**
   * Push a value to the left of a list
   * @param key The list key
   * @param value The value to push
   * @returns Promise that resolves to the new length of the list
   */
  async lpush(key: string, value: string): Promise<number> {
    const connection = await this.getConnection()
    return await connection.lpush(key, value)
  }

  /**
   * Pop a value from the right of a list
   * @param key The list key
   * @returns Promise that resolves to the popped value or null if list is empty
   */
  async rpop(key: string): Promise<string | null> {
    const connection = await this.getConnection()
    return await connection.rpop(key)
  }

  /**
   * Publish a message to a channel
   * @param channel The channel name
   * @param message The message to publish
   * @returns Promise that resolves to the number of subscribers that received the message
   */
  async publish(channel: string, message: string): Promise<number> {
    const connection = await this.getConnection()
    return await connection.publish(channel, message)
  }

  /**
   * Subscribe to a channel
   * @param channel The channel name
   * @param callback Function to call when a message is received
   * @returns Promise that resolves to a subscription object
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<{ unsubscribe: () => Promise<void> }> {
    const connection = await this.getConnection()
    return await connection.subscribe(channel, callback)
  }
}

/**
 * Factory function to create a Redis service
 * This should be called from the application layer with the appropriate adapter
 * @param redisPort The Redis port implementation to use
 * @returns A new RedisService instance
 */
export function createRedisService(redisPort: RedisPort): RedisService {
  return new RedisService(redisPort)
}
