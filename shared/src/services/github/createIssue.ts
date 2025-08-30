import type {
  CreateIssueInput,
  GithubIssuesWritePort,
} from "@/shared/src/core/ports/github-issues-write"

// Intention-focused use-case. Business rules (e.g., title length) can go here.
export async function createIssueForRepo(
  port: GithubIssuesWritePort,
  input: CreateIssueInput
) {
  // Example domain rule: trim inputs
  const sanitized = {
    ...input,
    title: input.title.trim(),
    body: input.body?.trim() ?? undefined,
  }
  return port.createIssue(sanitized)
}

