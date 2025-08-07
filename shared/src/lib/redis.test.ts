import { RedisService } from "./redis.js"
import type { RedisPort, RedisConnection } from "@/core/ports/RedisPort.js"

// TODO: Seems OK, but this should be in __tests__ folder.

// Mock Redis connection for testing
class MockRedisConnection implements RedisConnection {
  private data = new Map<string, string>()

  async ping(): Promise<string> {
    return "PONG"
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.data.set(key, value)
  }

  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0
  }

  async lpush(key: string, value: string): Promise<number> {
    const list = this.data.get(key) ? JSON.parse(this.data.get(key)!) : []
    list.unshift(value)
    this.data.set(key, JSON.stringify(list))
    return list.length
  }

  async rpop(key: string): Promise<string | null> {
    const list = this.data.get(key) ? JSON.parse(this.data.get(key)!) : []
    return list.pop() || null
  }

  async publish(channel: string, message: string): Promise<number> {
    // Mock implementation
    return 1
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<{ unsubscribe: () => Promise<void> }> {
    // Mock implementation
    return {
      unsubscribe: async () => {},
    }
  }

  async quit(): Promise<void> {
    // Mock implementation
  }

  async duplicate(): Promise<RedisConnection> {
    return new MockRedisConnection()
  }
}

// Mock Redis port for testing
class MockRedisPort implements RedisPort {
  private connection: MockRedisConnection | null = null

  async getConnection(): Promise<RedisConnection> {
    if (!this.connection) {
      this.connection = new MockRedisConnection()
    }
    return this.connection
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.quit()
      this.connection = null
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const connection = await this.getConnection()
      const result = await connection.ping()
      return result === "PONG"
    } catch {
      return false
    }
  }
}

describe("RedisService", () => {
  let redisService: RedisService
  let mockRedisPort: MockRedisPort

  beforeEach(() => {
    mockRedisPort = new MockRedisPort()
    redisService = new RedisService(mockRedisPort)
  })

  afterEach(async () => {
    await redisService.close()
  })

  it("should ping Redis successfully", async () => {
    const result = await redisService.ping()
    expect(result).toBe("PONG")
  })

  it("should set and get values", async () => {
    await redisService.set("test-key", "test-value")
    const result = await redisService.get("test-key")
    expect(result).toBe("test-value")
  })

  it("should delete values", async () => {
    await redisService.set("test-key", "test-value")
    const deleteResult = await redisService.del("test-key")
    expect(deleteResult).toBe(1)

    const getResult = await redisService.get("test-key")
    expect(getResult).toBeNull()
  })

  it("should handle list operations", async () => {
    await redisService.lpush("test-list", "item1")
    await redisService.lpush("test-list", "item2")

    const popResult = await redisService.rpop("test-list")
    expect(popResult).toBe("item1")
  })

  it("should check health status", async () => {
    const isHealthy = await redisService.isHealthy()
    expect(isHealthy).toBe(true)
  })
})
