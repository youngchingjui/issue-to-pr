// lib/types/api/github.ts
import { z } from "zod"

// GET /api/github/repos/[user]/[repo]
// Parse path params and produce the port-friendly input { fullName: string }
export const GetRepoRequestSchema = z
  .object({
    user: z.string().min(1),
    repo: z.string().min(1),
  })
  .transform(({ user, repo }) => ({ fullName: `${user}/${repo}` }))

export type GetRepoRequest = z.infer<typeof GetRepoRequestSchema>

// Success response mirrors RepoDetails (shared port)
export const GetRepoResponse = z.object({
  fullName: z.string(),
  owner: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  defaultBranch: z.string(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]),
  url: z.string().url(),
  cloneUrl: z.string().url(),
  has_issues: z.boolean(),
})
export type RepoDetailsResponse = z.infer<typeof GetRepoResponse>

// Consistent error payload for API routes
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z
    .enum([
      "AuthRequired",
      "RepoNotFound",
      "Forbidden",
      "RateLimited",
      "Unknown",
    ])
    .optional(),
  retryAfter: z.string().optional(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>
