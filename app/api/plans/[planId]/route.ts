import { NextRequest, NextResponse } from "next/server"
import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"

const service = new WorkflowPersistenceService()

export async function GET(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { planId } = params
  if (!planId) {
    return NextResponse.json({ error: "Missing planId" }, { status: 400 })
  }
  try {
    const plan = await service.getPlanById(planId)
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }
    return NextResponse.json(plan)
  } catch (err) {
    console.error("Failed to fetch plan", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { planId } = params
  if (!planId) {
    return NextResponse.json({ error: "Missing planId" }, { status: 400 })
  }
  try {
    const data = await req.json()
    const { status } = data
    if (!status || !["draft", "approved", "implemented"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    // TODO: Auth check (for now assume authorized)
    const updated = await service.updatePlanStatus(planId, status)
    if (!updated) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, plan: updated })
  } catch (err) {
    console.error("Failed to update plan status", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
