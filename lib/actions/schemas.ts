import { z } from "zod"

// Create Issue Action
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
