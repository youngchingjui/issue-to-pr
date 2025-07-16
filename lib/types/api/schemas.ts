// TODO: Move API route schemas here, can be used by both client and server

import { z } from "zod"

import { plan753EvaluationSchema } from "@/lib/evals/evalTool"
import { ChatCompletionMessageParamSchema } from "@/lib/types/chat"

export const PostPlanRequestSchema = z.object({
  issueNumber: z.number(),
  content: z.string().min(1),
  repoFullName: z.string().min(1),
})
export type PostPlanRequest = z.infer<typeof PostPlanRequestSchema>

export const AlignmentCheckRequestSchema = z.object({
  repoFullName: z.string().min(1),
  pullNumber: z.number(),
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

// POST /api/playground/evals request body
export const EvaluatePlanRequestSchema = z.object({
  plan: z.string().trim().min(1),
  context: z
    .object({
      repoFullName: z.string().min(1).optional(),
      issueNumber: z.number().optional(),
      type: z.string().optional(),
    })
    .optional(),
})
export type EvaluatePlanRequest = z.infer<typeof EvaluatePlanRequestSchema>

// POST /api/playground/evals response body
export const EvaluatePlanResponseSchema = z.object({
  result: plan753EvaluationSchema.optional(),
  message: ChatCompletionMessageParamSchema.optional(),
})
export type EvaluatePlanResponse = z.infer<typeof EvaluatePlanResponseSchema>
