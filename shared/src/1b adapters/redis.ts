// TODO: This file should be called `ioredis-adapter.ts`. Use git mv to rename it.

import Redis from "ioredis"

import {
  RedisConnection,
  RedisPort,
  RedisSubscription,
} from "../0 core/ports/RedisPort.js"

/**
 * Wrapper class that adapts ioredis to our abstract RedisConnection interface
 */
class IORedisConnectionAdapter implements RedisConnection {
  constructor(private client: Redis) {}

  async ping(): Promise<string> {
    return await this.client.ping()
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key)
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
    return await this.client.rpop(key)
  }

  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message)
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<RedisSubscription> {
    const subscriber = this.client.duplicate()
    await subscriber.subscribe(channel)

    subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message)
      }
    })

    return {
      unsubscribe: async () => {
        await subscriber.unsubscribe(channel)
        await subscriber.quit()
      },
    }
  }

  async quit(): Promise<void> {
    await this.client.quit()
  }

  async duplicate(): Promise<RedisConnection> {
    const duplicateClient = this.client.duplicate()
    return new IORedisConnectionAdapter(duplicateClient)
  }
}

export class RedisAdapter implements RedisPort {
  private client: Redis | null = null
  private readonly url: string

  constructor(url?: string) {
    this.url = url || process.env.REDIS_URL || "redis://localhost:6379"
  }

  async getConnection(): Promise<RedisConnection> {
    if (!this.client) {
      this.client = new Redis(this.url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })

      // Handle connection events
      this.client.on("connect", () => {
        console.log("[Redis] Connected to Redis server")
      })

      this.client.on("error", (err) => {
        console.error("[Redis] Connection error:", err)
      })

      this.client.on("close", () => {
        console.log("[Redis] Connection closed")
      })

      // Wait for connection to be ready
      await this.client.connect()
    }

    return new IORedisConnectionAdapter(this.client)
  }

  /**
   * Get the underlying ioredis client for BullMQ compatibility
   * BullMQ specifically requires ioredis, so we need this method
   * @returns Promise that resolves to the ioredis client
   */
  async getIORedisClient(): Promise<Redis> {
    if (!this.client) {
      await this.getConnection() // This will initialize the client
    }
    return this.client!
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
    }
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
      console.error("[Redis] Health check failed:", error)
      return false
    }
  }
}
