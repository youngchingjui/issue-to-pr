import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams
    const repo = search.get("repo")
    const issue = search.get("issue")

    const session = await auth()
    const login = session?.profile?.login

    const allRuns = await listWorkflowRuns(
      repo && issue
        ? { repoFullName: repo, issueNumber: parseInt(issue) }
        : undefined
    )

    // Determine repositories owned/accessible by the current user
    let allowedRepos: Set<string> | null = null
    try {
      const repos = await listUserRepositories()
      allowedRepos = new Set(repos.map((r) => r.nameWithOwner))
    } catch (err) {
      console.error("[WorkflowRunsAPI] Failed to list user repositories", err)
      // If unauthenticated or error, do not return any runs
      return NextResponse.json({ runs: [] })
    }

    const filtered = allRuns.filter((run) => {
      const repoOk = run.issue && allowedRepos!.has(run.issue.repoFullName)
      const initiatorOk = login && run.initiatorGithubLogin === login
      return Boolean(repoOk || initiatorOk)
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

