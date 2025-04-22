import { NextRequest, NextResponse } from "next/server"

import { WorkflowPersistenceService } from "@/lib/services/WorkflowPersistenceService"

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params
    const service = new WorkflowPersistenceService()
    const plan = await service.getPlanById(planId)

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error("Error fetching plan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params
    const { status } = await request.json()

    if (!status || !["draft", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status provided" },
        { status: 400 }
      )
    }

    const service = new WorkflowPersistenceService()
    await service.updatePlanStatus(planId, status)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating plan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
