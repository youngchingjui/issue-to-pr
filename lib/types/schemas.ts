import { z } from "zod"

export const PostPlanRequestSchema = z.object({
  issueNumber: z.number(),
  repoFullName: z.string().min(1),
  content: z.string().min(1),
})

export type PostPlanRequest = z.infer<typeof PostPlanRequestSchema>
