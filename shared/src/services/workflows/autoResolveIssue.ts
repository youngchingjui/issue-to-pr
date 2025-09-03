import { z } from "zod"

// Shared zod schema for orchestrating the autoResolveIssue workflow via BullMQ
// Ensures worker receives a fully-typed, JSON-serializable payload

export const RepoFullNameSchema = z
  .string()
  .regex(/^[^/]+\/[^/]+$/, "Repository must be in 'owner/repo' format")

export const AutoResolveIssueJobDataSchema = z.object({
  jobId: z.string().min(1),
  repoFullName: RepoFullNameSchema,
  issueNumber: z.number(),
  // The user-scoped OpenAI API key that initiated this workflow
  openaiApiKey: z.string().min(1),
  // GitHub App installation token used by the worker to access GitHub
  installationToken: z.string().min(1),
  // Minimal shapes for GitHub objects the workflow relies on. We allow extra fields
  // since these are passed straight from Octokit responses.
  repository: z
    .object({
      full_name: z.string(),
      default_branch: z.string(),
    })
    .passthrough(),
  issue: z
    .object({
      number: z.number(),
      title: z.string().nullable().optional(),
      body: z.string().nullable().optional(),
    })
    .passthrough(),
})

export type AutoResolveIssueJobData = z.infer<typeof AutoResolveIssueJobDataSchema>

