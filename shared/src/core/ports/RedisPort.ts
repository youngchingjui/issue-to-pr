/**
 * Abstract Redis connection interface
 * This defines the contract for Redis operations without depending on specific libraries
 */
export interface RedisConnection {
  /**
   * Ping the Redis server
   * @returns Promise that resolves to "PONG" if successful
   */
  ping(): Promise<string>

  /**
   * Get a value from Redis
   * @param key The key to get
   * @returns Promise that resolves to the value or null if not found
   */
  get(key: string): Promise<string | null>

  /**
   * Set a value in Redis
   * @param key The key to set
   * @param value The value to set
   * @param ttl Optional time-to-live in seconds
   * @returns Promise that resolves when the operation completes
   */
  set(key: string, value: string, ttl?: number): Promise<void>

  /**
   * Delete a key from Redis
   * @param key The key to delete
   * @returns Promise that resolves to the number of keys deleted
   */
  del(key: string): Promise<number>

  /**
   * Push a value to the left of a list
   * @param key The list key
   * @param value The value to push
   * @returns Promise that resolves to the new length of the list
   */
  lpush(key: string, value: string): Promise<number>

  /**
   * Pop a value from the right of a list
   * @param key The list key
   * @returns Promise that resolves to the popped value or null if list is empty
   */
  rpop(key: string): Promise<string | null>

  /**
   * Publish a message to a channel
   * @param channel The channel name
   * @param message The message to publish
   * @returns Promise that resolves to the number of subscribers that received the message
   */
  publish(channel: string, message: string): Promise<number>

  /**
   * Subscribe to a channel
   * @param channel The channel name
   * @param callback Function to call when a message is received
   * @returns Promise that resolves to a subscription object
   */
  subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<RedisSubscription>

  /**
   * Close the connection
   * @returns Promise that resolves when the connection is closed
   */
  quit(): Promise<void>

  /**
   * Create a duplicate connection (useful for pub/sub)
   * @returns Promise that resolves to a new Redis connection
   */
  duplicate(): Promise<RedisConnection>
}

/**
 * Redis subscription interface for pub/sub operations
 */
export interface RedisSubscription {
  /**
   * Unsubscribe from the channel
   * @returns Promise that resolves when unsubscribed
   */
  unsubscribe(): Promise<void>
}

/**
 * Redis port interface following clean architecture principles
 * This defines the contract for Redis operations without depending on specific libraries
 */
export interface RedisPort {
  /**
   * Get a Redis connection
   * @returns Promise that resolves to a Redis connection object
   */
  getConnection(): Promise<RedisConnection>

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
