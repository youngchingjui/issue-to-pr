// This route calls a workflow that uses an LLM to understand a Github issue,
// Explore possibilities, understand the codebase,
// Then generates a post as a comment on the issue.
// The comment should include the following sections:
// - Understanding the issue
// - Possible solutions
// - Relevant code
// - Suggested plan

import { NextRequest, NextResponse } from "next/server"

import { GitHubRepository } from "@/lib/types"
import commentOnIssue from "@/lib/workflows/commentOnIssue"

type RequestBody = {
  issueNumber: number
  repo: GitHubRepository
}

export async function POST(request: NextRequest) {
  const { issueNumber, repo }: RequestBody = await request.json()

  await commentOnIssue(issueNumber, repo)

  return NextResponse.json({ message: "Comment posted" })
}
