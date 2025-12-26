import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { listUserRepositories } from "@/lib/github/graphql/queries/listUserRepositories"
import { getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const session = await auth()
    const login = session?.profile?.login

    const { workflow, issue } = await getWorkflowRunWithDetails(
      params.workflowId
    )

    // Authorization: allow if initiator is the requester or repo is owned
    const repos = await listUserRepositories().catch(() => [])
    const allowedRepos = new Set(repos.map((r) => r.nameWithOwner))
    const initiatorOk = login && workflow.initiatorGithubLogin === login
    const repoOk = issue && allowedRepos.has(issue.repoFullName)

    if (!initiatorOk && !repoOk) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If authorized, return events
    const details = await getWorkflowRunWithDetails(params.workflowId)
    return NextResponse.json({ events: details.events })
  } catch (err) {
    console.error("Error fetching workflow events:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

