import { NextRequest, NextResponse } from "next/server"
import { resolveIssue } from "@/lib/github"

export async function POST(request: NextRequest) {
  try {
    const { issueId } = await request.json()

    if (typeof issueId !== "number") {
      return NextResponse.json(
        { error: "Invalid issueId provided." },
        { status: 400 }
      )
    }

    await resolveIssue(issueId)

    return NextResponse.json(
      { message: "Issue resolved successfully." },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error resolving issue:", error)
    return NextResponse.json(
      { error: "Failed to resolve issue." },
      { status: 500 }
    )
  }
}
