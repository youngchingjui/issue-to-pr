import { z } from "zod"

export const AutoResolveIssueRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string().min(1),
})

export const AutoResolveIssueResponseSchema = z.object({
  jobId: z.string(),
})

export const AutoResolveIssueErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
})

export type AutoResolveIssueRequest = z.infer<
  typeof AutoResolveIssueRequestSchema
>
export type AutoResolveIssueResponse = z.infer<
  typeof AutoResolveIssueResponseSchema
>
export type AutoResolveIssueErrorResponse = z.infer<
  typeof AutoResolveIssueErrorResponseSchema
>
