import { z } from "zod"

export const SummarizeIssueJobSchema = z.object({
  type: z.literal("summarizeIssue"),
  title: z.string(),
  body: z.string(),
})

export type SummarizeIssueJob = z.infer<typeof SummarizeIssueJobSchema>
