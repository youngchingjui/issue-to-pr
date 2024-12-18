import { NextRequest, NextResponse } from "next/server"
import { generateNewContent } from "@/lib/utils"
import { getIssue, getFileContent, createGitHubBranch } from "@/lib/github"

export async function POST(request: NextRequest) {
  try {
    const { issueId } = await request.json()

    if (typeof issueId !== "number") {
      return NextResponse.json(
        { error: "Invalid issueId provided." },
        { status: 400 }
      )
    }

    const issue = await getIssue(issueId)

    // Create branch name from issue
    const branchName = `${issueId}-${issue.title
      .toLowerCase()
      .replace(/\s+/g, "-")}`

    // Generate code based on issue
    const fileContent = await getFileContent("app/page.tsx")
    const instructions = `
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
      title: `Fix #${issueId}: ${issue.title}`,
      branchName,
      baseBranch: "main",
      body: `Fixes #${issueId}`,
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
