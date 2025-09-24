import { z } from "zod"

export const SummarizeIssueJobSchema = z.object({
  name: z.literal("summarizeIssue"),
  data: z.object({
    title: z.string(),
    body: z.string(),
  }),
})

export type SummarizeIssueJob = z.infer<typeof SummarizeIssueJobSchema>

export const JobEventSchema = z.discriminatedUnion("name", [
  SummarizeIssueJobSchema,
])

export type JobEvent = z.infer<typeof JobEventSchema>
