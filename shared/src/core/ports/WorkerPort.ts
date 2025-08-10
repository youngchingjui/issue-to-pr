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
import type { QueueConfig } from "@/core/entities/Queue"

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

  // NOTE: WorkerPort focuses on worker lifecycle and events; job/queue ops live in their own ports

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
