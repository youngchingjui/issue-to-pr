import { z } from "zod"

// Question: would zod schemas belong in /shared/lib,
// Given the code-org strategy we laid out in /docs/code-architecture.md?
// If not here, then how should we think about storing these zod schemas? Where do we save them?

// Queue names (must match worker)
export const QUEUE_NAMES = {
  RESOLVE_ISSUE: "resolve-issue",
  COMMENT_ON_ISSUE: "comment-on-issue",
  AUTO_RESOLVE_ISSUE: "auto-resolve-issue",
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

// Job data validation schemas
export const resolveIssueJobDataSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  jobId: z.string(),
  createPR: z.boolean(),
})

export const commentOnIssueJobDataSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  jobId: z.string(),
  postToGithub: z.boolean(),
})

export const autoResolveIssueJobDataSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string(),
  jobId: z.string(),
})

// Discriminated union schema for enqueue requests
export const enqueueRequestSchema = z.discriminatedUnion("queueName", [
  z.object({
    queueName: z.literal(QUEUE_NAMES.RESOLVE_ISSUE),
    data: resolveIssueJobDataSchema,
  }),
  z.object({
    queueName: z.literal(QUEUE_NAMES.COMMENT_ON_ISSUE),
    data: commentOnIssueJobDataSchema,
  }),
  z.object({
    queueName: z.literal(QUEUE_NAMES.AUTO_RESOLVE_ISSUE),
    data: autoResolveIssueJobDataSchema,
  }),
])

// Response schemas
export const enqueueResponseSchema = z.object({
  jobId: z.string(),
})

export const enqueueErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
})

// TypeScript types derived from schemas
export type ResolveIssueJobData = z.infer<typeof resolveIssueJobDataSchema>
export type CommentOnIssueJobData = z.infer<typeof commentOnIssueJobDataSchema>
export type AutoResolveIssueJobData = z.infer<
  typeof autoResolveIssueJobDataSchema
>
export type EnqueueRequest = z.infer<typeof enqueueRequestSchema>
export type EnqueueResponse = z.infer<typeof enqueueResponseSchema>
export type EnqueueErrorResponse = z.infer<typeof enqueueErrorResponseSchema>
