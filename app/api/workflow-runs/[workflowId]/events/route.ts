import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const session = await auth()
    const login = session?.profile?.login
    if (!login) return NextResponse.json({ events: [] })

    const { workflow, issue, events } = await getWorkflowRunWithDetails(
      params.workflowId
    )

    const isOwnedByUser = (repoFullName?: string) => {
      if (!repoFullName) return false
      const [owner] = repoFullName.split("/")
      return owner.toLowerCase() === login.toLowerCase()
    }

    const authorized =
      (workflow.initiatorGithubLogin &&
        workflow.initiatorGithubLogin === login) ||
      (issue && isOwnedByUser(issue.repoFullName))

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ events })
  } catch (err) {
    console.error("Error fetching workflow events:", err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

