// shared/src/core/entities/Queue.ts

// High-level queue configuration used across ports/adapters
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

export type QueueState = "active" | "paused" | "closed"

export interface QueueCounts {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export interface JobSummary {
  id: string
  name?: string
  progress?: number | object
  data: unknown
  timestamp?: number
  processedOn?: number | null
  finishedOn?: number | null
  failedReason?: string | null
  returnvalue?: unknown
}

export interface WorkerInfo {
  id?: string
  name?: string
  concurrency?: number
  processed?: number
}

export interface QueueStatus {
  name: string
  state?: QueueState
  counts: QueueCounts
  activeJobs: JobSummary[]
  recentCompleted: JobSummary[]
  recentFailed: JobSummary[]
  workers: WorkerInfo[]
}
