import { backOff } from "exponential-backoff"
import Redis from "ioredis"

class SharedRedisManager {
  private static instance: Redis | null = null
  private static isConnecting: boolean = false
  private static lastErrorTime: number = 0
  private static errorCount: number = 0

  private constructor() {}

  private static async initializeClient(): Promise<Redis> {
    // Support both Redis URL and Upstash (for compatibility)
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

    if (!redisUrl) {
      throw new Error(
        "Redis URL not found in environment variables (REDIS_URL or UPSTASH_REDIS_REST_URL)"
      )
    }

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      lazyConnect: true,
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
      if (SharedRedisManager.instance) {
        try {
          await SharedRedisManager.instance.ping()
          return SharedRedisManager.instance
        } catch (error) {
          // Connection is dead, clear it and try to reconnect
          console.error(
            "Redis connection lost, will attempt to reconnect:",
            error
          )
          SharedRedisManager.instance = null
        }
      }

      // Prevent multiple simultaneous connection attempts
      if (SharedRedisManager.isConnecting) {
        throw new Error("Redis connection attempt already in progress")
      }

      // Implement rate limiting for error logging
      const now = Date.now()
      if (now - SharedRedisManager.lastErrorTime < 60000) {
        // 1 minute
        SharedRedisManager.errorCount++
        if (SharedRedisManager.errorCount > 5) {
          // Only log every 5 minutes if we're seeing frequent errors
          if (now - SharedRedisManager.lastErrorTime > 300000) {
            console.error(
              "Multiple Redis connection failures in the last 5 minutes"
            )
            SharedRedisManager.lastErrorTime = now
            SharedRedisManager.errorCount = 0
          }
          throw new Error("Redis connection failed - too many recent attempts")
        }
      } else {
        SharedRedisManager.errorCount = 0
      }

      SharedRedisManager.isConnecting = true
      SharedRedisManager.lastErrorTime = now

      // Implement exponential backoff for connection attempts
      SharedRedisManager.instance = await backOff(
        () => SharedRedisManager.initializeClient(),
        {
          numOfAttempts: 5,
          startingDelay: 1000, // Start with 1 second
          maxDelay: 30000, // Max 30 seconds between attempts
          timeMultiple: 2,
          jitter: "full",
        }
      )

      SharedRedisManager.isConnecting = false
      SharedRedisManager.errorCount = 0
      return SharedRedisManager.instance
    } catch (error) {
      SharedRedisManager.isConnecting = false
      throw new Error(`Failed to establish Redis connection: ${error}`)
    }
  }

  public static async disconnect(): Promise<void> {
    if (SharedRedisManager.instance) {
      await SharedRedisManager.instance.quit()
      SharedRedisManager.instance = null
    }
  }
}

// Export function to get the Redis client
export async function getSharedRedisClient(): Promise<Redis> {
  return SharedRedisManager.getClient()
}

// Export the manager for advanced usage
export { SharedRedisManager }
