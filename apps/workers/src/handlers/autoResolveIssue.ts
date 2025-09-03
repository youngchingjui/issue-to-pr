import autoResolveIssue from "@/lib/workflows/autoResolveIssue"
import type { GitHubIssue, GitHubRepository } from "@/lib/types/github"
import { AutoResolveIssueJobDataSchema } from "@shared/services/workflows/autoResolveIssue"

// Keep this file focused on processing a single job type.
// All heavy lifting is delegated to the existing workflow implementation.

export async function handleAutoResolveIssueJob(raw: unknown) {
  const data = AutoResolveIssueJobDataSchema.parse(raw)

  const issue: GitHubIssue = data.issue as unknown as GitHubIssue
  const repository: GitHubRepository =
    data.repository as unknown as GitHubRepository

  await autoResolveIssue({
    issue,
    repository,
    apiKey: data.openaiApiKey,
    jobId: data.jobId,
    sessionToken: data.installationToken,
  })
}

