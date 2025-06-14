// TODO: Move API route schemas here, can be used by both client and server

import { z } from "zod"

export const PostPlanRequestSchema = z.object({
  issueNumber: z.number(),
  content: z.string().min(1),
  repoFullName: z.string().min(1),
})
export type PostPlanRequest = z.infer<typeof PostPlanRequestSchema>

export const AlignmentCheckRequestSchema = z.object({
  repoFullName: z.string().min(1),
  pullNumber: z.number(),
  openAIApiKey: z.string(),
})
export type AlignmentCheckRequest = z.infer<typeof AlignmentCheckRequestSchema>

export const AlignmentCheckResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
})
export type AlignmentCheckResponse = z.infer<
  typeof AlignmentCheckResponseSchema
>
