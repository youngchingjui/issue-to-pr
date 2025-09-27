import { z } from "zod"

export const SummarizeIssueJobSchema = z.object({
  name: z.literal("summarizeIssue"),
  data: z.object({
    title: z.string(),
    body: z.string(),
  }),
})

export type SummarizeIssueJob = z.infer<typeof SummarizeIssueJobSchema>

export const SimulateLongRunningWorkflowJobSchema = z.object({
  name: z.literal("simulateLongRunningWorkflow"),
  data: z.object({
    seconds: z.number().int().positive().default(10),
  }),
})

export type SimulateLongRunningWorkflowJob = z.infer<
  typeof SimulateLongRunningWorkflowJobSchema
>

export const JobEventSchema = z.discriminatedUnion("name", [
  SummarizeIssueJobSchema,
  SimulateLongRunningWorkflowJobSchema,
])

export type JobEvent = z.infer<typeof JobEventSchema>
