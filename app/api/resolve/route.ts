import { NextRequest, NextResponse } from "next/server"
import { generateNewContent } from "@/lib/utils"
import {
  getIssue,
  getFileContent,
  createPullRequest,
  GitHubError,
} from "@/lib/github"
import simpleGit from "simple-git"

const FILE_TO_EDIT = "app/playground/index.ts"
const NEW_BRANCH_NAME = "playground-fix"
const DIRECTORY_PATH = "."
import { promises as fs } from "fs"

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
    // TODO: Find fileContent type
    let fileContent
    try {
      fileContent = await getFileContent(FILE_TO_EDIT)
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      } else {
        return NextResponse.json(
          { error: "Failed to fetch file content." },
          { status: 500 }
        )
      }
    }

    // TODO: Dynamically generate instructions based on the issue
    const instructions = `
    Please generate a new file called "${FILE_TO_EDIT}" that will resolve this issue:
      Title: ${issue.title}
      Description: ${issue.body}
    `
    const newCode = await generateNewContent(
      fileContent.toString(),
      instructions
    )

    // Save the new code to the file
    await fs.writeFile(FILE_TO_EDIT, newCode.code)

    // Create new branch with name of issue
    const git = simpleGit(DIRECTORY_PATH)

    try {
      // Should create new branch if it doesn't exist
      // Or checkout existing branch if it does

      await git.checkout(NEW_BRANCH_NAME)
    } catch (error) {
      // TODO: Handle error if branch checkout not successful because of existing uncommitted changes
      console.error("Error checking out branch:", error)
    }

    // Stage the specific file
    await git.add(FILE_TO_EDIT)

    // Commit new code to branch
    try {
      await git.commit(`fix: ${issue.number}: ${issue.title}`)
    } catch (error) {
      // TODO: handle errors if there are not differences or changes to commit
      console.error("Error committing code:", error)
    }

    // Push commit
    try {
      await git.push("origin", NEW_BRANCH_NAME)
    } catch (error) {
      console.error("Error pushing commit:", error)
    }

    // Generate PR on latest HEAD of branch
    // TODO: Find type for pr
    let pr
    try {
      pr = await createPullRequest(issueNumber, NEW_BRANCH_NAME)
    } catch (error) {
      // TODO: Handle error if pull request already exists
      if (error.response.data.errors[0].message.includes("already exists")) {
        return NextResponse.json({
          error: `Pull request already exists for issue. Please remove any existing pull requests from ${NEW_BRANCH_NAME} to continue.`,
          status: 400,
        })
      }
      // TODO: Handle errors if PR creation fails because of API limits, such as rate limits, plan limits, etc.
      console.error("Error creating PR:", error)
    }

    return NextResponse.json(
      { message: "Issue resolved successfully.", pr: pr.data.html_url },
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
