import { NextRequest, NextResponse } from "next/server"

// Simple key validation by querying Anthropic models endpoint
export const POST = async (req: NextRequest) => {
  const { apiKey } = await req.json()

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "API key is missing" }, { status: 400 })
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    })

    if (response.ok) {
      return NextResponse.json({ success: true }, { status: 200 })
    } else if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: "Authentication error: Invalid API key" },
        { status: 401 }
      )
    } else {
      const errorData: unknown = await response
        .json()
        .catch(() => ({} as unknown))
      return NextResponse.json(
        { error: (errorData as { error?: string }).error || "An error occurred" },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error("[Anthropic Check] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unforeseen error occurred: " + String(error) },
      { status: 500 }
    )
  }
}

