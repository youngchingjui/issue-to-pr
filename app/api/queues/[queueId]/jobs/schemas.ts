import { z } from "zod"

// GET /api/queues/{queueId}/jobs
export const listJobsRequestSchema = z.object({
  status: z
    .enum(["waiting", "active", "completed", "failed", "delayed"])
    .optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

export const listJobsResponseSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      data: z.any(),
      status: z.enum(["waiting", "active", "completed", "failed", "delayed"]),
      timestamp: z.number(),
      processedOn: z.number().nullable(),
    })
  ),
  total: z.number(),
  cursor: z.string().nullable(),
})

// POST /api/queues/{queueId}/jobs
export const enqueueJobsRequestSchema = z.object({
  jobs: z.array(
    z.object({
      data: z.any(),
    })
  ),
})

export const enqueueJobsResponseSchema = z.object({
  jobIds: z.array(z.string()),
})
