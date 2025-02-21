import { Redis } from "@upstash/redis"

// Singleton Redis client
class RedisManager {
  private static instance: Redis | null = null

  private constructor() {}

  public static getClient(): Redis {
    if (!RedisManager.instance) {
      RedisManager.instance = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    }
    return RedisManager.instance
  }
}

export const redis = RedisManager.getClient()
