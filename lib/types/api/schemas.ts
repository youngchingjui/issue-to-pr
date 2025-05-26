// TODO: Move API route schemas here, can be used by both client and server

import { z } from "zod"
import { repoFullNameSchema } from "../../schemas/repoFullName"

export const PostPlanRequestSchema = z.object({
  issueNumber: z.number(),
  content: z.string().min(1),
  repoFullName: repoFullNameSchema,
})
export type PostPlanRequest = z.infer<typeof PostPlanRequestSchema>
