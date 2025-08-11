import { z } from "zod"

export const FetchGitHubItemRequestSchema = z.object({
  type: z.enum(["issue", "pull"]),
  number: z.number(),
  fullName: z.string(),
})

export const FetchGitHubItemResponseSchema = z
  .object({
    type: z.enum(["issue", "pull"]),
    // The actual data structure varies based on type, so we use a union or any for now
    data: z.any().optional(),
  })
  .passthrough() // Allow additional properties from the GitHub API response

export const FetchGitHubItemErrorResponseSchema = z.object({
  error: z.string(),
  details: z.union([z.string(), z.array(z.any())]).optional(),
})

export type FetchGitHubItemRequest = z.infer<
  typeof FetchGitHubItemRequestSchema
>
export type FetchGitHubItemResponse = z.infer<
  typeof FetchGitHubItemResponseSchema
>
export type FetchGitHubItemErrorResponse = z.infer<
  typeof FetchGitHubItemErrorResponseSchema
>
