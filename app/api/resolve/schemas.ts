import { z } from "zod"

export const ResolveRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  postToGithub: z.boolean().default(false),
  createPR: z.boolean().default(false),
  environment: z.enum(["typescript", "python"]).optional(),
  installCommand: z.string().optional(),
  planId: z.string().optional(),
})

export const ResolveResponseSchema = z.object({
  jobId: z.string(),
})

export const ResolveErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
})

export type ResolveRequest = z.infer<typeof ResolveRequestSchema>
export type ResolveResponse = z.infer<typeof ResolveResponseSchema>
export type ResolveErrorResponse = z.infer<typeof ResolveErrorResponseSchema>
