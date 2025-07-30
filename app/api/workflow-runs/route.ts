import { NextRequest, NextResponse } from "next/server"

import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams
    const repo = search.get("repo")
    const issue = search.get("issue")

    const allRuns = await listWorkflowRuns(
      repo && issue
        ? { repoFullName: repo, issueNumber: parseInt(issue) }
        : undefined
    )

    // If a specific repository/issue is queried, we assume the caller already
    // has permission (the repository page itself should be protected). In that
    // case we simply return the runs.
    if (repo && issue) {
      return NextResponse.json({ runs: allRuns })
    }

    // Otherwise, we need to filter by the repositories the current user can
    // access to avoid leaking private information.
    let allowedRepos: Set<string> | null = null
    try {
      const repos = await listUserRepositories()
      allowedRepos = new Set(repos.map((r) => r.nameWithOwner))
    } catch (err) {
      // Failure to fetch means unauthenticated or API error – in either case we
      // refuse to return any runs to prevent data leakage.
      console.error("[WorkflowRunsAPI] Failed to list user repositories", err)
      return NextResponse.json({ runs: [] })
    }

    const filtered = allRuns.filter((run) => {
      if (!run.issue) return false
      return allowedRepos!.has(run.issue.repoFullName)
    })

    return NextResponse.json({ runs: filtered })
  } catch (err) {
    console.error("Error listing workflow runs:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

