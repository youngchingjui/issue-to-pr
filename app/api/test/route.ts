import { NextResponse } from "next/server"

import RipgrepSearchTool from "@/lib/tools/RipgrepSearchTool"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test API is only available in development mode" },
      { status: 403 }
    )
  }

  try {
    // Initialize the RipgrepSearchTool with the project root directory
    const projectRoot = process.cwd()
    const ripgrepTool = new RipgrepSearchTool(projectRoot)

    // Test searching for "TestButton" in the codebase
    const searchResults = await ripgrepTool.handler({
      query: "TestButton",
      ignoreCase: true,
      hidden: false,
      follow: false,
    })

    const result = {
      message: "Ripgrep search test completed",
      timestamp: new Date().toISOString(),
      searchQuery: "TestButton",
      searchResults,
      searchDirectory: projectRoot,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Test API error:", error)
    return NextResponse.json({ error: "Test API failed" }, { status: 500 })
  }
}
