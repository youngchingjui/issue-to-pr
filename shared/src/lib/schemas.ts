import { z } from "zod"

// Question: would zod schemas belong in /shared/lib,
// Given the code-org strategy we laid out in /docs/code-architecture.md?
// If not here, then how should we think about storing these zod schemas? Where do we save them?

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
