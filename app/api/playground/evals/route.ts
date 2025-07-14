import { NextRequest, NextResponse } from "next/server"

import { evaluatePlan } from "@/lib/actions/evaluatePlan"
import { PlanEvaluationRequestSchema } from "@/lib/types/evaluation"

export async function POST(req: NextRequest) {
  try {
    const { plan } = PlanEvaluationRequestSchema.parse(await req.json())
    const result = await evaluatePlan(plan)
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to evaluate"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
