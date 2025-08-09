// Question: Do these interfaces belong in /entities or /ports? Or in another place entirely?

/**
 * Worker job data interface
 */
export interface WorkerJobData {
  id: string
  data: Record<string, unknown>
  progress?: number
}

/**
 * Worker job result interface
 */
export interface WorkerJobResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

/**
 * Worker event types
 */
export type WorkerEventType = "completed" | "failed" | "progress" | "error"

/**
 * Worker event interface
 */
export interface WorkerEvent {
  type: WorkerEventType
  jobId?: string
  data?: unknown
  error?: Error
}

/**
 * Worker configuration interface
 */
export interface WorkerConfig {
  name: string
  concurrency: number
  processor: (job: WorkerJobData) => Promise<WorkerJobResult>
}

/**
 * Queue configuration interface
 */
export interface QueueConfig {
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

/**
 * Worker port interface following clean architecture principles
 * This defines the contract for queue/worker operations without depending on specific libraries
 */
export interface WorkerPort {
  /**
   * Create a queue
   * @param config Queue configuration
   * @returns Promise that resolves to a queue instance
   */
  createQueue(config: QueueConfig): Promise<unknown>

  /**
   * Create a worker
   * @param config Worker configuration
   * @returns Promise that resolves to a worker instance
   */
  createWorker(config: WorkerConfig): Promise<unknown>

  /**
   * Add a job to a queue
   * @param queueName Name of the queue
   * @param data Job data
   * @param options Optional job options
   * @returns Promise that resolves to the job ID
   */
  addJob(
    queueName: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<string>

  /**
   * Get job progress
   * @param jobId Job ID
   * @returns Promise that resolves to the job progress (0-100)
   */
  getJobProgress(jobId: string): Promise<number>

  /**
   * Update job progress
   * @param jobId Job ID
   * @param progress Progress percentage (0-100)
   * @returns Promise that resolves when progress is updated
   */
  updateJobProgress(jobId: string, progress: number): Promise<void>

  /**
   * Listen to worker events
   * @param worker Worker instance
   * @param eventType Event type to listen for
   * @param callback Event callback function
   */
  onWorkerEvent(
    worker: unknown,
    eventType: WorkerEventType,
    callback: (event: WorkerEvent) => void
  ): void

  /**
   * Close a worker
   * @param worker Worker instance
   * @returns Promise that resolves when worker is closed
   */
  closeWorker(worker: unknown): Promise<void>

  /**
   * Close a queue
   * @param queue Queue instance
   * @returns Promise that resolves when queue is closed
   */
  closeQueue(queue: unknown): Promise<void>

  /**
   * Close all workers and queues
   * @returns Promise that resolves when all are closed
   */
  closeAll(): Promise<void>
}
