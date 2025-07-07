import { NextRequest, NextResponse } from "next/server";
import { getEventHistory } from "@/lib/services/redis-stream";

// GET /api/workflow/:workflowId/events - returns event list for polling
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const events = await getEventHistory(params.workflowId);
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json({ error: "Failed to get events" }, { status: 500 });
  }
}
