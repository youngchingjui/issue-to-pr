// Workflow queue implementation for orchestrating durable, resumable workflows (BullMQ)
import { Queue, Worker, QueueScheduler, Job, Processor } from "bullmq"
import IORedis from "ioredis"

// Optional: You can import logger/helpers if required
// import { logger } from "@/lib/utils/server"

const connection = new IORedis(process.env.REDIS_URL || "")

// Main BullMQ queue for running workflows
type WorkflowJobData = {
  workflow: string // e.g. "resolveIssue", "commentOnIssue", etc.
  params: Record<string, any>
}

const WORKFLOW_QUEUE_NAME = "workflow-jobs"

export const workflowQueue = new Queue<WorkflowJobData>(WORKFLOW_QUEUE_NAME, { connection })
export const workflowQueueScheduler = new QueueScheduler(WORKFLOW_QUEUE_NAME, { connection })

export const addWorkflowJob = async (
  workflow: string,
  params: Record<string, any>,
  opts = {}
) => {
  return workflowQueue.add(workflow, { workflow, params }, opts)
}

// Util: Get Job by ID
export const getJobById = async (jobId: string) => {
  return workflowQueue.getJob(jobId)
}

// Util: Get Job Status by ID
export const getJobStatus = async (jobId: string) => {
  const job = await getJobById(jobId)
  if (!job) return null
  const state = await job.getState()
  return { state, ...job.toJSON() }
}

// Worker registration
export const registerWorkflowProcessor = (processor: Processor<WorkflowJobData>) => {
  const worker = new Worker<WorkflowJobData>(
    WORKFLOW_QUEUE_NAME,
    processor,
    { connection, autorun: true, concurrency: 1 }
  )

  worker.on("completed", (job) => {
    // Optionally log job completion
    // logger.info(`Workflow job ${job.id} completed: ${job.name}`)
  })

  worker.on("failed", (job, err) => {
    // Optionally log job error
    // logger.error(`Workflow job ${job?.id} failed`, err)
  })

  return worker
}

// For use on startup - re-process stuck/incomplete jobs as necessary (future work)

