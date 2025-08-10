import type { WorkerEvent, WorkerPort } from "@/core/ports/WorkerPort"

export interface WorkerDefinition {
  name: string
  concurrency: number
  processor: (job: {
    id: string
    data: Record<string, unknown>
    progress?: number
  }) => Promise<{
    success: boolean
    data?: Record<string, unknown>
    error?: string
  }>
}

export interface QueueDefinition {
  name: string
  defaultJobOptions?: {
    attempts?: number
    backoff?: {
      type: "exponential" | "fixed"
      delay: number
    }
    removeOnComplete?: number
    removeOnFail?: number
  }
}

export class WorkerService {
  private workers: Map<string, unknown> = new Map()
  private queues: Map<string, unknown> = new Map()
  private eventListeners: Map<string, Array<(event: WorkerEvent) => void>> =
    new Map()

  constructor(private readonly workerPort: WorkerPort) {}

  /**
   * Start all workers with the provided configurations
   * @param workerDefinitions Array of worker definitions
   * @param queueDefinitions Array of queue definitions
   */
  async startWorkers(
    workerDefinitions: WorkerDefinition[],
    queueDefinitions: QueueDefinition[]
  ): Promise<void> {
    console.log("[WorkerService] Starting workers...")

    try {
      // Create queues first
      for (const queueDef of queueDefinitions) {
        const queue = await this.workerPort.createQueue({
          name: queueDef.name,
          defaultJobOptions: queueDef.defaultJobOptions,
        })
        this.queues.set(queueDef.name, queue)
        console.log(`[WorkerService] Created queue: ${queueDef.name}`)
      }

      // Create workers
      for (const workerDef of workerDefinitions) {
        const worker = await this.workerPort.createWorker({
          name: workerDef.name,
          concurrency: workerDef.concurrency,
          processor: workerDef.processor,
        })

        this.workers.set(workerDef.name, worker)

        // Set up event listeners
        this.setupWorkerEventListeners(worker, workerDef.name)

        console.log(
          `[WorkerService] Started worker: ${workerDef.name} (concurrency: ${workerDef.concurrency})`
        )
      }

      console.log(`[WorkerService] All workers started successfully`)
      console.log(`[WorkerService] Listening for jobs on queues:`)
      for (const queueDef of queueDefinitions) {
        console.log(`  - ${queueDef.name}`)
      }
    } catch (error) {
      console.error("[WorkerService] Failed to start workers:", error)
      throw error
    }
  }

  // Note: Job operations now live under JobPort; WorkerService stays focused on worker lifecycle

  /**
   * Add event listener for worker events
   * @param workerName Worker name
   * @param callback Event callback function
   */
  onWorkerEvent(
    workerName: string,
    callback: (event: WorkerEvent) => void
  ): void {
    if (!this.eventListeners.has(workerName)) {
      this.eventListeners.set(workerName, [])
    }
    this.eventListeners.get(workerName)!.push(callback)
  }

  /**
   * Gracefully shutdown all workers and queues
   */
  async shutdown(): Promise<void> {
    console.log("[WorkerService] Shutting down workers gracefully...")

    try {
      // Close all workers
      const workerClosePromises = Array.from(this.workers.values()).map(
        (worker) => this.workerPort.closeWorker(worker)
      )

      // Close all queues
      const queueClosePromises = Array.from(this.queues.values()).map((queue) =>
        this.workerPort.closeQueue(queue)
      )

      await Promise.all([...workerClosePromises, ...queueClosePromises])

      this.workers.clear()
      this.queues.clear()
      this.eventListeners.clear()

      console.log("[WorkerService] All workers shut down successfully")
    } catch (error) {
      console.error("[WorkerService] Error during shutdown:", error)
      throw error
    }
  }

  /**
   * Set up event listeners for a worker
   * @param worker Worker instance
   * @param workerName Worker name
   */
  private setupWorkerEventListeners(worker: unknown, workerName: string): void {
    const listeners = this.eventListeners.get(workerName) || []

    // Set up completed event
    this.workerPort.onWorkerEvent(worker, "completed", (event) => {
      console.log(
        `[WorkerService] Job ${event.jobId} completed in worker ${workerName}`
      )
      listeners.forEach((callback) => callback(event))
    })

    // Set up failed event
    this.workerPort.onWorkerEvent(worker, "failed", (event) => {
      console.error(
        `[WorkerService] Job ${event.jobId} failed in worker ${workerName}:`,
        event.error
      )
      listeners.forEach((callback) => callback(event))
    })

    // Set up error event
    this.workerPort.onWorkerEvent(worker, "error", (event) => {
      console.error(`[WorkerService] Worker ${workerName} error:`, event.error)
      listeners.forEach((callback) => callback(event))
    })
  }
}
