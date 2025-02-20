"use client"

import { CreatePullRequestButton } from "@/components/CreatePullRequestButton"
import { GitHubRepository } from "@/lib/types"

export function IssueActionsDropdown({
  issueNumber,
  repo,
}: {
  issueNumber: number
  repo: GitHubRepository
}) {
  return <CreatePullRequestButton issueNumber={issueNumber} repo={repo} />
}
