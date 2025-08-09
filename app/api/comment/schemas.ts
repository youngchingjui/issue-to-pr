import { z } from "zod"

export const CommentRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string().min(1),
  postToGithub: z.boolean().default(false),
})

export const CommentResponseSchema = z.object({
  jobId: z.string(),
})

export const CommentErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
})

export type CommentRequest = z.infer<typeof CommentRequestSchema>
export type CommentResponse = z.infer<typeof CommentResponseSchema>
export type CommentErrorResponse = z.infer<typeof CommentErrorResponseSchema>
