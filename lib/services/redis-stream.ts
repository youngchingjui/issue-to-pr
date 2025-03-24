"use server"

import { createClient, RedisClientType, RedisDefaultModules } from "redis"

import { BaseStreamEvent } from "@/lib/types/events"

export interface RedisSubscriber {
  subscribe: (channel: string, listener: () => void) => Promise<void>
  unsubscribe: (channel: string) => Promise<void>
  on: (
    event: "message",
    callback: (channel: string, message: string) => void
  ) => void
  disconnect: () => Promise<void>
}

let service: RedisStreamService | null = null

async function getService() {
  if (!service) {
    service = new RedisStreamService()
    await service.connect()
  }
  return service
}

export async function publishEvent(
  workflowId: string,
  event: BaseStreamEvent
): Promise<void> {
  const svc = await getService()
  return svc.publishEvent(workflowId, event)
}

export async function subscribeToEvents(
  workflowId: string
): Promise<RedisSubscriber> {
  const svc = await getService()
  return svc.subscribeToEvents(workflowId)
}

export async function getEventHistory(
  workflowId: string
): Promise<BaseStreamEvent[]> {
  const svc = await getService()
  return svc.getEventHistory(workflowId)
}

export async function cleanup(workflowId: string): Promise<void> {
  const svc = await getService()
  return svc.cleanup(workflowId)
}

class RedisStreamService {
  private client: RedisClientType<RedisDefaultModules>
  private publisher: RedisClientType<RedisDefaultModules>

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    })
    // Create a duplicate connection for publishing to avoid blocking
    this.publisher = this.client.duplicate()
  }

  async connect() {
    await this.client.connect()
    await this.publisher.connect()

    this.client.on("error", (err) => console.error("Redis client error:", err))
    this.publisher.on("error", (err) =>
      console.error("Redis publisher error:", err)
    )
  }

  async disconnect() {
    await this.client.disconnect()
    await this.publisher.disconnect()
  }

  async publishEvent(
    workflowId: string,
    event: BaseStreamEvent
  ): Promise<void> {
    if (!this.publisher.isOpen)
      throw new Error("Redis publisher is not connected")

    try {
      const eventString = JSON.stringify(event)
      // Publish to real-time channel
      await this.publisher.publish(`workflow:${workflowId}`, eventString)
      // Store in history
      await this.publisher.lPush(`workflow:${workflowId}:history`, eventString)
    } catch (err) {
      console.error("Failed to publish event:", err)
      throw new Error("Failed to publish workflow event")
    }
  }

  async subscribeToEvents(workflowId: string): Promise<RedisSubscriber> {
    if (!this.client.isOpen) throw new Error("Redis client is not connected")

    const subscriber = this.client.duplicate()
    await subscriber.connect()

    // Return a simplified interface that matches our RedisSubscriber type
    return {
      subscribe: async (channel: string, listener: () => void) => {
        await subscriber.subscribe(channel, listener)
      },
      unsubscribe: async (channel: string) => {
        await subscriber.unsubscribe(channel)
      },
      on: (
        event: "message",
        callback: (channel: string, message: string) => void
      ) => {
        subscriber.on(event, callback)
      },
      disconnect: async () => {
        await subscriber.disconnect()
      },
    }
  }

  async getEventHistory(workflowId: string): Promise<BaseStreamEvent[]> {
    if (!this.client.isOpen) throw new Error("Redis client is not connected")

    try {
      const events = await this.client.lRange(
        `workflow:${workflowId}:history`,
        0,
        -1
      )
      // Reverse the array to maintain chronological order since lPush adds to the front
      return events.reverse().map((event) => JSON.parse(event))
    } catch (err) {
      console.error("Failed to get event history:", err)
      throw new Error("Failed to retrieve workflow event history")
    }
  }

  async cleanup(workflowId: string): Promise<void> {
    if (!this.client.isOpen) throw new Error("Redis client is not connected")

    try {
      // Delete history after a workflow is complete
      await this.client.del(`workflow:${workflowId}:history`)
    } catch (err) {
      console.error("Failed to cleanup workflow:", err)
      throw new Error("Failed to cleanup workflow resources")
    }
  }
}
