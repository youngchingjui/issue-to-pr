import { RedisAdapter } from "../1b adapters/redis.js"

let redisAdapter: RedisAdapter | null = null

/**
 * Get the Redis adapter instance
 * @returns RedisAdapter instance
 */
export function getRedisAdapter(): RedisAdapter {
  if (!redisAdapter) {
    redisAdapter = new RedisAdapter()
  }
  return redisAdapter
}

/**
 * Get a Redis connection for use with BullMQ
 * @returns Promise that resolves to a Redis connection
 */
export async function getRedisClient() {
  const adapter = getRedisAdapter()
  return await adapter.getConnection()
}

/**
 * Close the Redis connection
 */
export async function closeRedisConnection() {
  if (redisAdapter) {
    await redisAdapter.close()
    redisAdapter = null
  }
}
