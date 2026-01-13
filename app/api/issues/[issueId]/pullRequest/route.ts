import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getLinkedPRNumberForIssue } from "@/lib/github/issues"

import {
  getLinkedPrParamsSchema,
  getLinkedPrQuerySchema,
  getLinkedPrResponseSchema,
} from "./schemas"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const search = request.nextUrl.searchParams
    const repo = search.get("repo")

    const { data: queryData, error: queryError } =
      getLinkedPrQuerySchema.safeParse({
        repo,
      })
    if (queryError) {
      return NextResponse.json(
        {
          error: repo
            ? "Invalid query parameters"
            : "Missing 'repo' query parameter",
          details: queryError.flatten(),
        },
        { status: 400 }
      )
    }

    const { data: paramsData, error: paramsError } =
      getLinkedPrParamsSchema.safeParse(params)
    if (paramsError) {
      return NextResponse.json(
        { error: "Invalid issue id", details: paramsError.flatten() },
        { status: 400 }
      )
    }

    const prNumber = await getLinkedPRNumberForIssue({
      repoFullName: queryData.repo,
      issueNumber: paramsData.issueId,
    })

    const response = getLinkedPrResponseSchema.parse({ prNumber })
    return NextResponse.json(response)
  } catch (err) {
    console.error("Error fetching PR for issue:", err)
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid response format",
          details: err.flatten?.() ?? err.issues,
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
