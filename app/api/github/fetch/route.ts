import { NextResponse } from "next/server"

import { getIssue } from "@/lib/github/issues"
import { getPullRequest } from "@/lib/github/pullRequests"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Parse the GitHub URL to extract owner, repo, and issue number
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)\/(issues|pull)\/(\d+)/
    const match = url.match(urlPattern)

    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub issue or pull request URL" },
        { status: 400 }
      )
    }

    const [, owner, repo, type, number] = match
    const fullName = `${owner}/${repo}`
    const numberInt = parseInt(number, 10)

    let data
    if (type === "issues") {
      data = await getIssue({ fullName, issueNumber: numberInt })
    } else {
      data = await getPullRequest({
        repoFullName: fullName,
        pullNumber: numberInt,
      })
    }

    return NextResponse.json({
      ...data,
      type: type === "issues" ? "issue" : "pull",
    })
  } catch (err) {
    console.error("Error fetching GitHub data:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch data" },
      { status: 500 }
    )
  }
}
