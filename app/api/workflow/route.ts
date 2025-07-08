import { NextRequest, NextResponse } from "next/server";
import { listWorkflowRuns } from "@/lib/neo4j/services/workflow";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const demoOnly = searchParams.get("demoOnly");

  // get all runs
  let runs = await listWorkflowRuns();
  // filter demo runs if needed
  if (demoOnly === "1") {
    runs = runs.filter((r) => r.id && r.id.startsWith("demo-swr-"));
  }

  return NextResponse.json(runs);
}

// No POST/PUT/DELETE here; handled by [workflowId]/route or /demo/route.

