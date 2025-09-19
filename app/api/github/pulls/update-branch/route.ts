import { NextResponse } from "next/server"
import { z } from "zod"

import { updatePullRequestBranch } from "@/lib/github/pullRequests"
import { repoFullNameSchema } from "@/lib/types/github"

const UpdateBranchRequestSchema = z.object({
  repoFullName: z.string().min(1),
  pullNumber: z.number().int().positive(),
  expectedHeadSha: z.string().length(40).optional(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { repoFullName, pullNumber, expectedHeadSha } =
      UpdateBranchRequestSchema.parse(json)

    // Reuse shared validation for owner/repo format
    // We only validate here; we still pass the original string downstream
    repoFullNameSchema.parse(repoFullName)

    const result = await updatePullRequestBranch({
      repoFullName,
      pullNumber,
      expectedHeadSha,
    })

    return NextResponse.json({ success: true, result })
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.errors },
        { status: 400 }
      )
    }
    console.error("Failed to update branch:", err)
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    )
  }
}
