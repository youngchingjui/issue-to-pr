import { NextRequest, NextResponse } from "next/server"

import { evaluatePlan } from "@/lib/evals/evaluatePlan"
import {
  EvaluatePlanRequestSchema,
  EvaluatePlanResponseSchema,
} from "@/lib/types/api/schemas"

export async function POST(req: NextRequest) {
  try {
    // Attempt to parse and validate body against schema
    const parsed = EvaluatePlanRequestSchema.safeParse(await req.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { plan, context } = parsed.data

    // Call underlying evaluation logic
    const result = await evaluatePlan(plan, context)

    const parsedResult = EvaluatePlanResponseSchema.parse(result)

    return NextResponse.json(parsedResult, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : "Unknown error",
      },
      { status: 500 }
    )
  }
}
