import { NextResponse } from "next/server"
import { z } from "zod"

import {
  getIssueListWithStatus,
  getLinkedPRNumbersForIssues,
} from "@/lib/github/issues"

const RequestSchema = z.object({
  repoFullName: z.string().min(3),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { repoFullName, page, per_page } = RequestSchema.parse(json)

    const issues = await getIssueListWithStatus({
      repoFullName,
      page,
      per_page,
    })

    const issueNumbers = issues.map((i) => i.number)
    const prMap = await getLinkedPRNumbersForIssues({
      repoFullName,
      issueNumbers,
    })

    const hasMore = issues.length === per_page

    return NextResponse.json({ issues, prMap, hasMore })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: err.errors },
        { status: 400 }
      )
    }
    console.error("Failed to list issues:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

