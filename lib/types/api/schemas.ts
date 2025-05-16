// TODO: Move API route schemas here, can be used by both client and server

import { z } from "zod"

export const PostPlanRequestSchema = z.object({
  issueNumber: z.number(),
  content: z.string().min(1),
  repoFullName: z.string().min(1),
})
export type PostPlanRequest = z.infer<typeof PostPlanRequestSchema>
