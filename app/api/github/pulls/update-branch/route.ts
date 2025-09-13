import { NextResponse } from "next/server"
import { z } from "zod"

import { updatePullRequestBranch } from "@/lib/github/pullRequests"

const UpdateBranchRequestSchema = z.object({
  repoFullName: z.string().min(1),
  pullNumber: z.number().int().positive(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { repoFullName, pullNumber } = UpdateBranchRequestSchema.parse(json)

    const result = await updatePullRequestBranch({
      repoFullName,
      pullNumber,
    })

    return NextResponse.json({ success: true, result })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.errors },
        { status: 400 }
      )
    }
    console.error("Failed to update branch:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update branch" },
      { status: 500 }
    )
  }
}

