import { z } from "zod"

//=========================
// TODO: to be implemented
// GET /api/queue/{queueId}/jobs
export const listJobsRequestSchema = z.object({})

export const listJobsResponseSchema = z.object({})

//=========================

// POST /api/queue/{queueId}/jobs
export const enqueueJobsRequestSchema = z.object({
  jobs: z.array(z.any()),
})

export const enqueueJobsResponseSchema = z.object({
  jobIds: z.array(z.string()),
})
