import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams
    const repo = search.get("repo")
    const issue = search.get("issue")

    const session = await auth()
    const login = session?.profile?.login

    // If unauthenticated, return empty to avoid leakage
    if (!login) return NextResponse.json({ runs: [] })

    const allRuns = await listWorkflowRuns(
      repo && issue
        ? { repoFullName: repo, issueNumber: parseInt(issue) }
        : undefined
    )

    // Authorization policy (v1): initiator-or-owner
    const isOwnedByUser = (repoFullName?: string) => {
      if (!repoFullName) return false
      const [owner] = repoFullName.split("/")
      return owner.toLowerCase() === login.toLowerCase()
    }

    const filtered = allRuns.filter((run) => {
      if (run.initiatorGithubLogin && run.initiatorGithubLogin === login) {
        return true
      }
      if (run.issue && isOwnedByUser(run.issue.repoFullName)) {
        return true
      }
      return false
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

