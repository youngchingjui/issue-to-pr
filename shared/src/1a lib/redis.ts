// TODO: Files in /lib should not be importing from adapters. They should only import from /core.
// TODO: We also need a README that explains this code architecture convention.
// TODO: We also need an eslint rule that enforces this.

import { RedisPort } from "../0 core/ports/RedisPort.js"
import { RedisAdapter } from "../1b adapters/redis.js"
import { UpstashRedisAdapter } from "../1b adapters/upstash-redis.js"

let redisAdapter: RedisPort | null = null

/**
 * Get the Redis adapter instance
 * @returns RedisPort instance
 */
export function getRedisAdapter(): RedisPort {
  if (!redisAdapter) {
    // Choose adapter based on environment variables
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      console.log("[Redis] Using Upstash Redis adapter")
      redisAdapter = new UpstashRedisAdapter()
    } else {
      console.log("[Redis] Using ioredis adapter")
      redisAdapter = new RedisAdapter()
    }
  }
  return redisAdapter
}

/**
 * Get a Redis connection
 * @returns Promise that resolves to a Redis connection
 */
export async function getRedisClient() {
  const adapter = getRedisAdapter()
  return await adapter.getConnection()
}

/**
 * Get a Redis connection specifically for BullMQ
 * BullMQ requires an ioredis connection, so we need to handle this specially
 * @returns Promise that resolves to an ioredis connection for BullMQ
 */
export async function getBullMQRedisClient() {
  // For BullMQ, we need to use ioredis specifically
  // This is a limitation of BullMQ - it doesn't work with other Redis clients
  const adapter = getRedisAdapter()

  if (adapter instanceof RedisAdapter) {
    return await adapter.getIORedisClient()
  }

  throw new Error(
    "BullMQ requires ioredis connection. Please use RedisAdapter for BullMQ operations."
  )
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
