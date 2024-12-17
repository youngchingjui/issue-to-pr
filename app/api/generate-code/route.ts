import { NextRequest, NextResponse } from "next/server"
import { generateCode } from "@/lib/github" // Implement this function in lib/github.ts

export async function POST(request: NextRequest) {
  try {
    const { issueId } = await request.json()

    if (typeof issueId !== "number") {
      return NextResponse.json(
        { error: "Invalid issueId provided." },
        { status: 400 }
      )
    }

    await generateCode(issueId)

    return NextResponse.json(
      { message: "Code generated successfully." },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error generating code:", error)
    return NextResponse.json(
      { error: "Failed to generate code." },
      { status: 500 }
    )
  }
}
