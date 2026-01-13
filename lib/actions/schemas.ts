import { z } from "zod"

import { modelList } from "@/shared/entities/llm/models"

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
  model: modelList.optional(),
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
    "REDIS_URL_NOT_SET",
    "LLM_ERROR",
    "INVALID_INPUT",
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

// =================================================
// Create Dependent PR Action
// =================================================

export const createDependentPRRequestSchema = z.object({
  repoFullName: z.string().min(1),
  pullNumber: z.number().int().positive(),
  jobId: z.string().optional(),
})
export type CreateDependentPRRequest = z.infer<
  typeof createDependentPRRequestSchema
>

const createDependentPRSuccessSchema = z.object({
  status: z.literal("success"),
  jobId: z.string().min(1),
})

const createDependentPRErrorSchema = z.object({
  status: z.literal("error"),
  code: z.enum([
    "AUTH_REQUIRED",
    "MISSING_API_KEY",
    "INVALID_INPUT",
    "UNKNOWN",
  ]),
  message: z.string().min(1),
})

export const createDependentPRResultSchema = z.discriminatedUnion("status", [
  createDependentPRSuccessSchema,
  createDependentPRErrorSchema,
])
export type CreateDependentPRResult = z.infer<
  typeof createDependentPRResultSchema
>

// =================================================
// Auto Resolve Issue Action
// =================================================

export const autoResolveIssueRequestSchema = z.object({
  repoFullName: z.string().min(1),
  issueNumber: z.number().int().positive(),
  branch: z.string().min(1).optional(),
  jobId: z.string().optional(),
})
export type AutoResolveIssueRequest = z.infer<
  typeof autoResolveIssueRequestSchema
>

const autoResolveIssueSuccessSchema = z.object({
  status: z.literal("success"),
  jobId: z.string().min(1),
})

const autoResolveIssueErrorSchema = z.object({
  status: z.literal("error"),
  code: z.enum(["INVALID_INPUT", "AUTH_REQUIRED", "UNKNOWN"]),
  message: z.string().min(1),
})

export const autoResolveIssueResultSchema = z.discriminatedUnion("status", [
  autoResolveIssueSuccessSchema,
  autoResolveIssueErrorSchema,
])
export type AutoResolveIssueResult = z.infer<
  typeof autoResolveIssueResultSchema
>
