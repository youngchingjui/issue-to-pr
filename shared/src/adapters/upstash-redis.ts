// TODO: In fact, we should probably have a /shared/src/adapters/redis/ folder
// to house all of the different redis adapters.

import { Redis } from "@upstash/redis"

import {
  RedisConnection,
  RedisPort,
  RedisSubscription,
} from "@/core/ports/RedisPort.js"

/**
 * Wrapper class that adapts Upstash Redis to our abstract RedisConnection interface
 */
class UpstashRedisConnectionAdapter implements RedisConnection {
  constructor(private client: Redis) {}

  async ping(): Promise<string> {
    return await this.client.ping()
  }

  async get(key: string): Promise<string | null> {
    const result = await this.client.get(key)
    return result as string | null
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key)
  }

  async lpush(key: string, value: string): Promise<number> {
    return await this.client.lpush(key, value)
  }

  async rpop(key: string): Promise<string | null> {
    const result = await this.client.rpop(key)
    return result as string | null
  }

  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message)
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<RedisSubscription> {
    // Note: Upstash Redis doesn't support pub/sub in the same way as traditional Redis
    // This is a limitation of the REST API. For real pub/sub, you'd need to use
    // a different approach or a different Redis client.
    throw new Error("Pub/sub not supported with Upstash Redis REST API")
  }

  async quit(): Promise<void> {
    // Upstash Redis doesn't have a quit method, but we can implement it as a no-op
    // or throw an error if you prefer to be explicit about this limitation
  }

  async duplicate(): Promise<RedisConnection> {
    // For Upstash Redis, we can create a new client instance
    // This is not a true duplicate but serves the same purpose
    const newClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    return new UpstashRedisConnectionAdapter(newClient)
  }
}

export class UpstashRedisAdapter implements RedisPort {
  private client: Redis | null = null

  constructor() {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new Error(
        "Upstash Redis credentials not found in environment variables"
      )
    }
  }

  async getConnection(): Promise<RedisConnection> {
    if (!this.client) {
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      // Test the connection
      try {
        await this.client.ping()
      } catch (error) {
        throw new Error(
          `Failed to connect to Upstash Redis: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    return new UpstashRedisConnectionAdapter(this.client)
  }

  async close(): Promise<void> {
    // Upstash Redis doesn't have a close method, but we can clear the reference
    this.client = null
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client) {
        return false
      }

      // Ping the Redis server to check health
      const result = await this.client.ping()
      return result === "PONG"
    } catch (error) {
      console.error("[Upstash Redis] Health check failed:", error)
      return false
    }
  }
}
