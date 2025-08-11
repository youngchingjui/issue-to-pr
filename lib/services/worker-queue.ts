"use server"

import { createClient, RedisClientType } from "redis"
import { v4 as uuidv4 } from "uuid"

export interface QueueJob<T = unknown> {
  id: string
  payload: T
  enqueuedAt: number
}

function queueKey(name: string): string {
  return `queue:${name}`
}

class WorkerQueueService {
  private client: RedisClientType | null = null
  private isConnecting = false

  private async getClient(): Promise<RedisClientType> {
    if (this.client?.isOpen) return this.client
    if (this.isConnecting) {
      // wait briefly until current connection finishes
      await new Promise((res) => setTimeout(res, 100))
      if (this.client?.isOpen) return this.client
      throw new Error("Redis connection in progress failed to establish")
    }
    this.isConnecting = true
    const client = createClient({ url: process.env.REDIS_URL })
    client.on("error", (err) => console.error("Redis WorkerQueue error", err))
    await client.connect()
    this.client = client
    this.isConnecting = false
    return client
  }

  /**
   * Enqueue a new job on the specified queue. Returns the job id.
   */
  async enqueue<T = unknown>(queueName: string, payload: T): Promise<string> {
    const client = await this.getClient()
    const job: QueueJob = {
      id: uuidv4(),
      payload,
      enqueuedAt: Date.now(),
    }
    await client.lPush(queueKey(queueName), JSON.stringify(job))
    return job.id
  }

  /**
   * Return the current length of a queue.
   */
  async getQueueLength(queueName: string): Promise<number> {
    const client = await this.getClient()
    return client.lLen(queueKey(queueName))
  }

  /**
   * Pop (blocking) a job from the queue. The timeout defaults to 0 (blocks forever).
   */
  async popJob<T = unknown>(
    queueName: string,
    timeoutSeconds = 0
  ): Promise<QueueJob<T> | null> {
    const client = await this.getClient()
    const res = (await client.brPop(queueKey(queueName), timeoutSeconds)) as
      | [string, string]
      | null
    if (!res) return null
    const [, value] = res
    return JSON.parse(value) as QueueJob<T>
  }

  /**
   * Convenience helper to start a long-running worker that continuously
   * processes jobs using the supplied handler function.
   * NOTE: This is intended to be executed in a dedicated Node process,
   * not within the Next.js request lifecycle.
   */
  async startWorker<T = unknown>(
    queueName: string,
    handler: (job: QueueJob<T>) => Promise<void>
  ): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const job = await this.popJob<T>(queueName, 0)
      if (!job) continue // Shouldn't happen with timeout 0 but TS-safety
      try {
        await handler(job)
      } catch (err) {
        console.error(`Worker error processing job ${job.id}:`, err)
      }
    }
  }
}

export const workerQueue = new WorkerQueueService()

