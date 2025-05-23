import { Redis } from "@upstash/redis"
import { backOff } from "exponential-backoff"

class RedisManager {
  private static instance: Redis | null = null
  private static isConnecting: boolean = false
  private static lastErrorTime: number = 0
  private static errorCount: number = 0

  private constructor() {}

  private static async initializeClient(): Promise<Redis> {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new Error("Redis credentials not found in environment variables")
    }

    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    // Test the connection
    try {
      await client.ping()
    } catch (error) {
      throw new Error(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return client
  }

  public static async getClient(): Promise<Redis> {
    try {
      // If we have an instance, test if it's still working
      if (RedisManager.instance) {
        try {
          await RedisManager.instance.ping()
          return RedisManager.instance
        } catch (error) {
          // Connection is dead, clear it and try to reconnect
          console.error(error)
          RedisManager.instance = null
          console.error("Redis connection lost, will attempt to reconnect")
        }
      }

      // Prevent multiple simultaneous connection attempts
      if (RedisManager.isConnecting) {
        throw new Error("Redis connection attempt already in progress")
      }

      // Implement rate limiting for error logging
      const now = Date.now()
      if (now - RedisManager.lastErrorTime < 60000) {
        // 1 minute
        RedisManager.errorCount++
        if (RedisManager.errorCount > 5) {
          // Only log every 5 minutes if we're seeing frequent errors
          if (now - RedisManager.lastErrorTime > 300000) {
            console.error(
              "Multiple Redis connection failures in the last 5 minutes"
            )
            RedisManager.lastErrorTime = now
            RedisManager.errorCount = 0
          }
          throw new Error("Redis connection failed - too many recent attempts")
        }
      } else {
        RedisManager.errorCount = 0
      }

      RedisManager.isConnecting = true
      RedisManager.lastErrorTime = now

      // Implement exponential backoff for connection attempts
      RedisManager.instance = await backOff(
        () => RedisManager.initializeClient(),
        {
          numOfAttempts: 5,
          startingDelay: 1000, // Start with 1 second
          maxDelay: 30000, // Max 30 seconds between attempts
          timeMultiple: 2,
          jitter: "full",
        }
      )

      RedisManager.isConnecting = false
      RedisManager.errorCount = 0
      return RedisManager.instance
    } catch (error) {
      RedisManager.isConnecting = false
      throw new Error(`Failed to establish Redis connection: ${error.message}`)
    }
  }

  public static async disconnect(): Promise<void> {
    if (RedisManager.instance) {
      // Upstash Redis doesn't require explicit disconnection
      RedisManager.instance = null
    }
  }
}

// Export an async function to get the Redis client
export async function getRedisClient(): Promise<Redis> {
  return RedisManager.getClient()
}

// Create a type-safe proxy that handles both methods and properties
export const redis = new Proxy({} as Redis, {
  get: (_target: Redis, prop: keyof Redis) => {
    return async (...args: unknown[]) => {
      const client = await RedisManager.getClient()
      const value = client[prop]
      if (typeof value === "function") {
        return value.apply(client, args)
      }
      return value
    }
  },
})
