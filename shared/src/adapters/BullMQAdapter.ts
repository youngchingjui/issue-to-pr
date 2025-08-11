import type { JobProgress } from "bullmq"
import type { BackoffOptions, BaseJobOptions, Job as BullJob } from "bullmq"
import { Job, Queue, QueueEvents, Worker } from "bullmq"
import type Redis from "ioredis"

import type { QueueConfig } from "@/core/entities/Queue"
import type {
  JobSummary,
  QueueCounts,
  QueueStatus,
  WorkerInfo,
} from "@/core/entities/Queue"
import type { IORedisPort } from "@/core/ports/IORedisPort"
import type { JobPort } from "@/core/ports/JobPort"
import type { QueuePort } from "@/core/ports/QueuePort"
import type {
  WorkerConfig,
  WorkerEvent,
  WorkerEventType,
  WorkerPort,
} from "@/core/ports/WorkerPort"

type PortBackoff = NonNullable<
  NonNullable<QueueConfig["defaultJobOptions"]>["backoff"]
>

export class BullMQAdapter implements WorkerPort, QueuePort, JobPort {
  private queues: Map<string, Queue> = new Map()
  private workers: Map<string, Worker> = new Map()
  private queueEvents: Map<string, QueueEvents> = new Map()

  constructor(private readonly redisPort: IORedisPort) {}

  private toBullMQBackoff(
    backoff: PortBackoff | undefined
  ): number | BackoffOptions | undefined {
    if (!backoff) return undefined
    return { type: backoff.type, delay: backoff.delay }
  }

  private toPortBackoff(
    backoff: number | BackoffOptions | undefined
  ): PortBackoff | undefined {
    if (typeof backoff === "number") {
      return { type: "fixed", delay: backoff }
    }
    if (!backoff) return undefined
    const delay = typeof backoff.delay === "number" ? backoff.delay : 0
    if (backoff.type === "fixed" || backoff.type === "exponential") {
      const normalizedType: PortBackoff["type"] =
        backoff.type === "exponential" ? "exponential" : "fixed"
      return { type: normalizedType, delay }
    }
    return { type: "fixed", delay }
  }

  async createQueue(config: QueueConfig): Promise<Queue> {
    const connectionOptions = await this.getBullMQConnectionOptions()

    const bullDefaultOptions: BaseJobOptions | undefined =
      config.defaultJobOptions
        ? {
            attempts: config.defaultJobOptions.attempts,
            backoff: this.toBullMQBackoff(config.defaultJobOptions.backoff),
            removeOnComplete: config.defaultJobOptions.removeOnComplete,
            removeOnFail: config.defaultJobOptions.removeOnFail,
          }
        : undefined

    const queue = new Queue(config.name, {
      connection: connectionOptions,
      defaultJobOptions: bullDefaultOptions,
    })

    this.queues.set(config.name, queue)
    return queue
  }

  async getQueueConfig(queueName: string): Promise<QueueConfig | null> {
    const queue = await this.ensureQueue(queueName)
    const defaults = queue.defaultJobOptions
    const config: QueueConfig = {
      name: queue.name,
      defaultJobOptions: defaults
        ? {
            attempts: defaults.attempts,
            backoff: this.toPortBackoff(defaults.backoff),
            removeOnComplete:
              typeof defaults.removeOnComplete === "number"
                ? defaults.removeOnComplete
                : undefined,
            removeOnFail:
              typeof defaults.removeOnFail === "number"
                ? defaults.removeOnFail
                : undefined,
          }
        : undefined,
    }
    return config
  }

  /**
   * Get the actual queue instance for advanced operations
   */
  getQueueInstance(queueName: string): Queue | null {
    return this.queues.get(queueName) || null
  }

  private async ensureQueue(queueName: string): Promise<Queue> {
    const existing = this.queues.get(queueName)
    if (existing) return existing
    const connectionOptions = await this.getBullMQConnectionOptions()
    const queue = new Queue(queueName, { connection: connectionOptions })
    this.queues.set(queueName, queue)
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

  // JobPort
  async addJob(
    queueName: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<string> {
    const queue = await this.ensureQueue(queueName)
    const job = await queue.add(queueName, data, options)
    return job.id!
  }

  private toJobSummary(job: BullJob | Job): JobSummary {
    return {
      id: String(job.id),
      name: (job as BullJob).name,
      progress:
        typeof job.progress === "number"
          ? job.progress
          : typeof (job.progress as unknown) === "object"
            ? (job.progress as unknown as object)
            : undefined,
      data: job.data,
      timestamp: (job as BullJob).timestamp,
      processedOn: (job as BullJob).processedOn,
      finishedOn: (job as BullJob).finishedOn,
      failedReason: (job as BullJob).failedReason ?? null,
      returnvalue: (job as BullJob).returnvalue,
    }
  }

  async getJob(queueName: string, jobId: string): Promise<JobSummary | null> {
    const queue = await this.ensureQueue(queueName)
    const job = await queue.getJob(jobId)
    return job ? this.toJobSummary(job) : null
  }

  async getJobProgress(queueName: string, jobId: string): Promise<number> {
    const queue = await this.ensureQueue(queueName)
    const job = await queue.getJob(jobId)
    if (!job) return 0
    return typeof job.progress === "number" ? job.progress : 0
  }

  async updateJobProgress(
    queueName: string,
    jobId: string,
    progress: number
  ): Promise<void> {
    const queue = await this.ensureQueue(queueName)
    const job = await queue.getJob(jobId)
    if (job) await job.updateProgress(progress)
  }

  // QueuePort
  async getQueueCounts(queueName: string): Promise<QueueCounts> {
    const queue = await this.ensureQueue(queueName)
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    )
    const c: any = counts
    return {
      waiting: c.waiting ?? 0,
      active: c.active ?? 0,
      completed: c.completed ?? 0,
      failed: c.failed ?? 0,
      delayed: c.delayed ?? 0,
    }
  }

  async getActiveJobs(queueName: string, limit = 20): Promise<JobSummary[]> {
    const queue = await this.ensureQueue(queueName)
    const jobs = await queue.getJobs(["active"], 0, limit)
    return jobs.map((j) => this.toJobSummary(j))
  }

  async getRecentJobs(
    queueName: string,
    types: Array<"completed" | "failed"> = ["completed", "failed"],
    limit = 20
  ): Promise<JobSummary[]> {
    const queue = await this.ensureQueue(queueName)
    const jobs = await queue.getJobs(types, 0, limit)
    return jobs.map((j) => this.toJobSummary(j))
  }

  async getWorkers(queueName: string): Promise<WorkerInfo[]> {
    const queue = await this.ensureQueue(queueName)
    const workers = await queue.getWorkers()
    return (workers as unknown[]).map((w) => {
      const anyW = w as Record<string, unknown>
      return {
        id: String(anyW.id ?? ""),
        name: String(anyW.name ?? ""),
        concurrency: Number(anyW.concurrency ?? 0),
        processed: Number((anyW as any).processed ?? 0),
      } as WorkerInfo
    })
  }

  async getQueueStatus(queueName: string): Promise<QueueStatus> {
    const [counts, activeJobs, recentCompleted, recentFailed, workers] =
      await Promise.all([
        this.getQueueCounts(queueName),
        this.getActiveJobs(queueName, 20),
        this.getRecentJobs(queueName, ["completed"], 10),
        this.getRecentJobs(queueName, ["failed"], 10),
        this.getWorkers(queueName),
      ])
    return {
      name: queueName,
      counts,
      activeJobs,
      recentCompleted,
      recentFailed,
      workers,
    }
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = await this.ensureQueue(queueName)
    await queue.pause()
  }

  // Removed WorkerPort global job progress; use JobPort instead

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
