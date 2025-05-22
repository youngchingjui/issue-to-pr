import { NextResponse } from "next/server"

// This route is for testing new functions. You can call any server-side function here
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test API is only available in development mode" },
      { status: 403 }
    )
  }

  try {
    // Any test code can be put here.
    const result = null
    return NextResponse.json(result)
  } catch (error) {
    console.error("Test API error:", error)
    return NextResponse.json(
      {
        error: "Test API failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
