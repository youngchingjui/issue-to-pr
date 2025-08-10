import type {
  JobSummary,
  QueueConfig,
  QueueCounts,
  QueueStatus,
  WorkerInfo,
} from "@/core/entities/Queue"

export interface QueuePort {
  // Lifecycle/config
  createQueue(config: QueueConfig): Promise<unknown>
  getQueueConfig(name: string): Promise<QueueConfig | null>

  // Introspection
  getQueueCounts(name: string): Promise<QueueCounts>
  getActiveJobs(name: string, limit?: number): Promise<JobSummary[]>
  getRecentJobs(
    name: string,
    types: Array<"completed" | "failed">,
    limit?: number
  ): Promise<JobSummary[]>
  getWorkers(name: string): Promise<WorkerInfo[]>
  getQueueStatus(name: string): Promise<QueueStatus>

  // Control
  pauseQueue(name: string): Promise<void>
}
