// shared/src/core/ports/JobPort.ts
import type { JobSummary } from "@/core/entities/Queue"

export interface JobPort {
  addJob(
    queueName: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<string>
  getJob(queueName: string, jobId: string): Promise<JobSummary | null>
  getJobProgress(queueName: string, jobId: string): Promise<number>
  updateJobProgress(
    queueName: string,
    jobId: string,
    progress: number
  ): Promise<void>
}
