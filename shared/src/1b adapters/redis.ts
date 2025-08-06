import Redis from "ioredis"

import { RedisPort } from "@/0 core/ports/redis.js"

export class RedisAdapter implements RedisPort {
  private client: Redis | null = null
  private readonly url: string

  constructor(url?: string) {
    this.url = url || process.env.REDIS_URL || "redis://localhost:6379"
  }

  async getConnection(): Promise<Redis> {
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

    return this.client
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
