import { NextResponse } from "next/server"
import { z } from "zod"

import { listBranches } from "@/lib/github/git"

export const dynamic = "force-dynamic"

const RequestSchema = z.object({
  repoFullName: z.string(),
})

export async function POST(request: Request) {
  try {
    const { repoFullName } = RequestSchema.parse(await request.json())
    const branches = await listBranches(repoFullName)
    return NextResponse.json({ branches })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.errors },
        { status: 400 }
      )
    }
    console.error("Failed to fetch branches:", err)
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    )
  }
}
