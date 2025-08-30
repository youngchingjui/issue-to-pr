import { NextResponse } from "next/server"
import { z } from "zod"

import { resolveMergeConflicts } from "@/lib/workflows/resolveMergeConflicts"

const RequestSchema = z.object({
  repoFullName: z.string().min(1),
  pullNumber: z.number(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { repoFullName, pullNumber } = RequestSchema.parse(body)

    await resolveMergeConflicts({ repoFullName, pullNumber })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }
    console.error("resolve-merge-conflicts error", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 }
    )
  }
}

