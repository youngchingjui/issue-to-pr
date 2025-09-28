import { z } from "zod"

//=========================
// TODO: to be implemented
// GET /api/queue/{queueId}/jobs
export const listJobsRequestSchema = z.object({})

export const listJobsResponseSchema = z.object({})

//=========================

// POST /api/queue/{queueId}/jobs

const SummarizeIssueJobSchema = z.object({
  name: z.literal("summarizeIssue"),
  data: z.object({
    title: z.string(),
    body: z.string(),
  }),
})

const SimulateLongRunningWorkflowJobSchema = z.object({
  name: z.literal("simulateLongRunningWorkflow"),
  data: z.object({
    seconds: z.number().int().positive().default(10),
  }),
})

// Note: githubInstallationId is added by the API endpoint,
// so we do not include it in the API request schema
const AutoResolveIssueJobSchema = z.object({
  name: z.literal("autoResolveIssue"),
  data: z.object({
    repoFullName: z.string(),
    issueNumber: z.number().int().positive(),
    branch: z.string().optional(),
    githubLogin: z.string(),
  }),
})

export const enqueueJobsRequestSchema = z.discriminatedUnion("name", [
  SummarizeIssueJobSchema,
  SimulateLongRunningWorkflowJobSchema,
  AutoResolveIssueJobSchema,
])

export type EnqueueJobsRequest = z.infer<typeof enqueueJobsRequestSchema>

export const enqueueJobsResponseSchema = z.object({
  jobId: z.string(),
})

export type EnqueueJobsResponse = z.infer<typeof enqueueJobsResponseSchema>
