import { NextResponse } from "next/server"
import { z } from "zod"

import { getIssueListWithStatus } from "@/lib/github/issues"

const QuerySchema = z.object({
  repo: z.string().min(1, "repo query param is required"),
  per_page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || !Number.isNaN(val), {
      message: "per_page must be a number",
    }),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = QuerySchema.parse({
      repo: searchParams.get("repo"),
      per_page: searchParams.get("per_page"),
    })

    const issues = await getIssueListWithStatus({
      repoFullName: query.repo,
      per_page: query.per_page ?? 25,
    })

    return NextResponse.json(issues)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error("Failed to fetch issues list", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}

