import { NextRequest, NextResponse } from "next/server"
import { createPullRequest } from "@/lib/github"

export async function POST(request: NextRequest) {
  try {
    const { issueId } = await request.json()

    if (typeof issueId !== "number") {
      return NextResponse.json(
        { error: "Invalid issueId provided." },
        { status: 400 }
      )
    }

    await createPullRequest(issueId)

    return NextResponse.json(
      { message: "Pull request created successfully." },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error creating pull request:", error)
    return NextResponse.json(
      { error: "Failed to create pull request." },
      { status: 500 }
    )
  }
}
