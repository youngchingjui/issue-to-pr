import { z } from "zod"

// =================================================
// Create Issue Action
// =================================================
export const createIssueActionSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
})
export type CreateIssueActionParams = z.infer<typeof createIssueActionSchema>

const success = z.object({
  status: z.literal("success"),
  issueUrl: z.string().min(1),
  number: z.number(),
})
const error = z.object({
  status: z.literal("error"),
  code: z.enum([
    "AuthRequired",
    "RepoNotFound",
    "IssuesDisabled",
    "RateLimited",
    "ValidationFailed",
    "Unknown",
  ]),
  message: z.string().min(1),
  issues: z.array(z.string()).optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})
export const createIssueActionResultSchema = z.discriminatedUnion("status", [
  success,
  error,
])
export type CreateIssueActionResult = z.infer<
  typeof createIssueActionResultSchema
>

// =================================================
// List Issues Action
// =================================================
export const listIssuesInputSchema = z.object({
  repoFullName: z.string().min(3),
  page: z.number().int().min(1).default(1).optional(),
  per_page: z.number().int().min(1).max(100).default(25).optional(),
})
export type ListIssuesInput = z.infer<typeof listIssuesInputSchema>

export const listIssuesResultSchema = z.object({
  issues: z.array(z.any()),
  prMap: z.record(z.number(), z.number().nullable()),
  hasMore: z.boolean(),
})
export type ListIssuesResult = z.infer<typeof listIssuesResultSchema>

// =================================================
// Resolve Issue Action
// =================================================
export const resolveIssueRequestSchema = z.object({
  repoFullName: z.string().min(1),
  issueNumber: z.number().int().positive(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
})
export type ResolveIssueRequest = z.infer<typeof resolveIssueRequestSchema>

const resolveIssueSuccessSchema = z.object({
  status: z.literal("success"),
  response: z.string(),
  issue: z.object({
    repoFullName: z.string().min(1),
    number: z.number().int().positive(),
    title: z.string().nullable().optional(),
    state: z.string().min(1),
    authorLogin: z.string().nullable().optional(),
    url: z.string().min(1),
  }),
})

const resolveIssueErrorSchema = z.object({
  status: z.literal("error"),
  code: z.enum([
    "AUTH_REQUIRED",
    "ISSUE_FETCH_FAILED",
    "ISSUE_NOT_OPEN",
    "MISSING_API_KEY",
    "LLM_ERROR",
    "UNKNOWN",
  ]),
  message: z.string().min(1),
  issueRef: z
    .object({
      repoFullName: z.string().min(1),
      number: z.number().int().positive(),
    })
    .optional(),
})

export const resolveIssueResultSchema = z.discriminatedUnion("status", [
  resolveIssueSuccessSchema,
  resolveIssueErrorSchema,
])
export type ResolveIssueResult = z.infer<typeof resolveIssueResultSchema>
