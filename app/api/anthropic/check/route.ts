import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"

const requestSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
})

// Simple key validation by querying Anthropic models endpoint
export const POST = async (req: NextRequest) => {
  const session = await auth()
  if (!session?.token?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    )
  }

  const { apiKey } = parsed.data

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
      const errorData: unknown = await response.json().catch(() => ({}))
      const errorSchema = z.object({ error: z.string() })
      const errorParsed = errorSchema.safeParse(errorData)
      const errorMessage = errorParsed.success
        ? errorParsed.data.error
        : "An error occurred"
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error("[Anthropic Check] Unexpected error:", error)
    return NextResponse.json(
      { error: "An unforeseen error occurred" },
      { status: 500 }
    )
  }
}
