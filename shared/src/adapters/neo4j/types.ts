import { z } from "zod"

export const workflowRunSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.date(),
  postToGithub: z.boolean().optional(),
})

export const workflowRunStateSchema = z.enum([
  "running",
  "completed",
  "error",
  "timedOut",
])

export const issueSchema = z.object({
  number: z.number(),
  createdAt: z.date().optional(),
  repoFullName: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  state: z.enum(["open", "closed"]).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  updatedAt: z.date().optional(),
})

export type Issue = z.infer<typeof issueSchema>
export type WorkflowRun = z.infer<typeof workflowRunSchema>
export type WorkflowRunState = z.infer<typeof workflowRunStateSchema>
