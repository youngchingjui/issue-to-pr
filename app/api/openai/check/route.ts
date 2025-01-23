import { NextRequest, NextResponse } from "next/server"

export const GET = async (req: NextRequest) => {
  // Get the API key from cookies
  const { apiKey } = await req.json()

  if (!apiKey) {
    return NextResponse.json({ error: "API key is missing" }, { status: 400 })
  }

  try {
    // Make a simple request to OpenAI to check if the key works
    const response = await fetch("https://api.openai.com/v1/engines", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (response.ok) {
      return NextResponse.json({ message: "API key is valid" }, { status: 200 })
    } else if (response.status === 401) {
      return NextResponse.json(
        { error: "Authentication error: Invalid API key" },
        { status: 401 }
      )
    } else {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error || "An error occurred" },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "An unforeseen error occurred: " + error },
      { status: 500 }
    )
  }
}
