import { NextRequest, NextResponse } from "next/server"

import { evaluatePlan } from "@/lib/evals/evaluatePlan"

/**
 * POST /api/playground/evals
 *
 * Request body (JSON):
 * {
 *   "plan": string,                       // required – raw implementation plan text
 *   "context"?: {                         // optional – metadata used by the evaluator
 *     "repoFullName"?: string,
 *     "issueNumber"?: number,
 *     "type"?: string
 *   }
 * }
 *
 * Response: 200 OK
 *   The JSON returned by `evaluatePlan` directly.
 *
 * Error responses:
 *   400 – malformed request body / missing plan
 *   500 – unexpected error when running the evaluation
 */
export async function POST(req: NextRequest) {
  try {
    // Parsing body may throw if not valid JSON
    const { plan, context } = await req.json()

    // Basic validation – plan must be non-empty string
    if (typeof plan !== "string" || !plan.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'plan'." },
        { status: 400 }
      )
    }

    // Narrow context to expected shape if provided
    let evalContext: {
      repoFullName?: string
      issueNumber?: number
      type?: string
    } | undefined

    if (context !== undefined) {
      if (typeof context !== "object" || Array.isArray(context)) {
        return NextResponse.json(
          { error: "'context' must be an object if provided." },
          { status: 400 }
        )
      }
      const { repoFullName, issueNumber, type } = context as Record<string, unknown>
      evalContext = {
        repoFullName: typeof repoFullName === "string" ? repoFullName : undefined,
        issueNumber: typeof issueNumber === "number" ? issueNumber : undefined,
        type: typeof type === "string" ? type : undefined,
      }
    }

    // Call underlying evaluation logic
    const result = await evaluatePlan(plan, evalContext)

    return NextResponse.json(result, { status: 200 })
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

