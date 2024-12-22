import { NextRequest, NextResponse } from "next/server"
import { generateNewContent } from "@/lib/utils"
import { getIssue, getFileContent, createGitHubBranch } from "@/lib/github"

export async function POST(request: NextRequest) {
  try {
    const { issueNumber } = await request.json()

    if (typeof issueNumber !== "number") {
      return NextResponse.json(
        { error: "Invalid issueNumber provided." },
        { status: 400 }
      )
    }

    const issue = await getIssue(issueNumber)

    // Create branch name from issue
    const branchName = `${issueNumber}-${issue.title
      .toLowerCase()
      .replace(/\s+/g, "-")}`

    // Generate code based on issue
    const fileContent = await getFileContent("app/api/resolve/route.ts")
    const instructions = `
    Please generate a new file called "app/api/resolve/route.ts" that will resolve this issue:
      Title: ${issue.title}
      Description: ${issue.body}
    `
    const newCode = await generateNewContent(
      fileContent.toString(),
      instructions
    )

    // Create branch and PR
    const mainRef = await getFileContent("refs/heads/main")
    await createGitHubBranch(branchName, mainRef.sha)

    const pr = await github.createGitHubPR({
      title: `Fix #${issueNumber}: ${issue.title}`,
      branchName,
      baseBranch: "main",
      body: `Fixes #${issueNumber}`,
    })

    return pr.data.html_url

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
