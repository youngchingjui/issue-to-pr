import type { JobProgress } from "bullmq"
import { Job, Queue, QueueEvents, Worker } from "bullmq"
import type Redis from "ioredis"

import type { IORedisPort } from "@/core/ports/IORedisPort"
import type {
  QueueConfig,
  WorkerConfig,
  WorkerEvent,
  WorkerEventType,
  WorkerPort,
} from "@/core/ports/WorkerPort"

export class BullMQAdapter implements WorkerPort {
  private queues: Map<string, Queue> = new Map()
  private workers: Map<string, Worker> = new Map()
  private queueEvents: Map<string, QueueEvents> = new Map()

  constructor(private readonly redisPort: IORedisPort) {}

  async createQueue(config: QueueConfig): Promise<Queue> {
    const connectionOptions = await this.getBullMQConnectionOptions()

    const queue = new Queue(config.name, {
      connection: connectionOptions,
      defaultJobOptions: config.defaultJobOptions,
    })

    this.queues.set(config.name, queue)
    return queue
  }

  async createWorker(config: WorkerConfig): Promise<Worker> {
    const connectionOptions = await this.getBullMQConnectionOptions()

    const worker = new Worker(
      config.name,
      async (job: Job) => {
        const workerJob = {
          id: job.id!,
          data: job.data,
          progress: typeof job.progress === "number" ? job.progress : undefined,
        }

        // Call the processor
        const result = await config.processor(workerJob)

        // Convert result back to BullMQ format
        if (!result.success) {
          throw new Error(result.error || "Job failed")
        }

        return result.data
      },
      {
        connection: connectionOptions,
        concurrency: config.concurrency,
      }
    )

    this.workers.set(config.name, worker)
    return worker
  }

  async addJob(
    queueName: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<string> {
    const queue = this.queues.get(queueName)
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`)
    }

    const job = await queue.add(queueName, data, options)
    return job.id!
  }

  async getJobProgress(jobId: string): Promise<number> {
    // This is a simplified implementation
    // In a real implementation, you'd need to track job progress across all queues
    return 0
  }

  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    // This is a simplified implementation
    // In a real implementation, you'd need to update job progress across all queues
  }

  onWorkerEvent(
    worker: Worker,
    eventType: WorkerEventType,
    callback: (event: WorkerEvent) => void
  ): void {
    switch (eventType) {
      case "completed":
        worker.on("completed", (job: Job) => {
          callback({
            type: "completed",
            jobId: job.id!,
            data: job.returnvalue,
          })
        })
        break

      case "failed":
        worker.on("failed", (job: Job | undefined, err: Error) => {
          callback({
            type: "failed",
            jobId: job?.id,
            error: err,
          })
        })
        break

      case "error":
        worker.on("error", (err: Error) => {
          callback({
            type: "error",
            error: err,
          })
        })
        break

      case "progress":
        worker.on("progress", (job: Job, progress: JobProgress) => {
          callback({
            type: "progress",
            jobId: job.id!,
            data: { progress: typeof progress === "number" ? progress : 0 },
          })
        })
        break
    }
  }

  async closeWorker(worker: Worker): Promise<void> {
    await worker.close()
  }

  async closeQueue(queue: Queue): Promise<void> {
    await queue.close()
  }

  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = []

    // Close all workers
    for (const worker of this.workers.values()) {
      closePromises.push(worker.close())
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      closePromises.push(queue.close())
    }

    // Close all queue events
    for (const events of this.queueEvents.values()) {
      closePromises.push(events.close())
    }

    await Promise.all(closePromises)

    this.workers.clear()
    this.queues.clear()
    this.queueEvents.clear()
  }

  private async getBullMQConnectionOptions(): Promise<Redis> {
    return await this.redisPort.getIORedisClient()
  }
}
