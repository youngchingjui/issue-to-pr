import { NextRequest, NextResponse } from "next/server"
import { listWorkflowRuns, getWorkflowRunWithDetails } from "@/lib/neo4j/services/workflow"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const details = url.searchParams.get("details") === "1"
    const runs = await listWorkflowRuns()

    if (!details) {
      // Return summary list only
      return NextResponse.json(runs)
    }

    // With details: fetch events, issue for each
    const expanded = await Promise.all(
      runs.map(async (run) =>
        getWorkflowRunWithDetails(run.id)
          .then((res) => ({ ...res }))
          .catch(() => ({ workflow: run, events: [], issue: run.issue }))
      )
    )
    return NextResponse.json(expanded)
  } catch (e) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

