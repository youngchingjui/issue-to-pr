import { NextRequest, NextResponse } from "next/server"
import { generateNewContent } from "@/lib/utils"
import {
  getIssue,
  getFileContent,
  createPullRequest,
  GitHubError,
} from "@/lib/github"
import simpleGit, { GitError } from "simple-git"

const FILE_TO_EDIT = "app/playground/index.ts"
const NEW_BRANCH_NAME = "playground-fix"
const DIRECTORY_PATH = "."
import { promises as fs } from "fs"
import {
  checkIfLocalBranchExists,
  createBranch,
  checkoutBranch,
} from "@/lib/git"

export async function POST(request: NextRequest) {
  try {
    console.debug("[DEBUG] Starting POST request handler")
    const { issueNumber } = await request.json()

    if (typeof issueNumber !== "number") {
      console.debug("[DEBUG] Invalid issue number provided:", issueNumber)
      return NextResponse.json(
        { error: "Invalid issueNumber provided." },
        { status: 400 }
      )
    }

    console.debug(`[DEBUG] Fetching issue #${issueNumber}`)
    const issue = await getIssue(issueNumber)

    // Create branch name from issue
    const branchName = `${issueNumber}-${issue.title
      .toLowerCase()
      .replace(/\s+/g, "-")}`
    console.debug(`[DEBUG] Generated branch name: ${branchName}`)

    console.debug("[DEBUG] Initializing git operations")
    const git = simpleGit(DIRECTORY_PATH)

    // Check if branch name already exists
    // If not, create it
    // Then, checkout the branch
    try {
      console.debug(`[DEBUG] Checking out branch: ${NEW_BRANCH_NAME}`)

      const branchExists = await checkIfLocalBranchExists(NEW_BRANCH_NAME)
      if (!branchExists) {
        await createBranch(NEW_BRANCH_NAME)
      }
      await checkoutBranch(NEW_BRANCH_NAME)
    } catch (error) {
      console.debug("[DEBUG] Error during branch checkout:", error)
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      )
    }

    // Generate code based on issue
    // TODO: Find fileContent type
    console.debug(
      `[DEBUG] Attempting to fetch file content from ${FILE_TO_EDIT}`
    )
    let fileContent
    try {
      fileContent = await getFileContent(FILE_TO_EDIT)
    } catch (error) {
      console.debug("[DEBUG] Error fetching file content:", error)
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
    console.debug("[DEBUG] Generating new code content based on issue")
    const instructions = `
    Please generate a new file called "${FILE_TO_EDIT}" that will resolve this issue:
      Title: ${issue.title}
      Description: ${issue.body}
    `
    const newCode = await generateNewContent(
      fileContent.toString(),
      instructions
    )

    console.debug("[DEBUG] Writing new code to file")
    await fs.writeFile(FILE_TO_EDIT, newCode.code)

    console.debug(`[DEBUG] Staging file: ${FILE_TO_EDIT}`)
    await git.add(FILE_TO_EDIT)

    console.debug("[DEBUG] Committing changes")
    try {
      await git.commit(`fix: ${issue.number}: ${issue.title}`)
    } catch (error) {
      // TODO: handle errors if there are not differences or changes to commit
      console.error("[ERROR] Error committing code:", error)
    }

    console.debug(`[DEBUG] Pushing to remote branch: ${NEW_BRANCH_NAME}`)
    try {
      await git.push("origin", NEW_BRANCH_NAME)
    } catch (error) {
      console.error("[ERROR] Error pushing commit:", error)
    }

    // Generate PR on latest HEAD of branch
    // TODO: Find type for pr
    console.debug("[DEBUG] Creating pull request")
    let pr
    try {
      pr = await createPullRequest(issueNumber, NEW_BRANCH_NAME)
    } catch (error) {
      // TODO: Handle error if pull request already exists
      console.debug("[DEBUG] Error creating pull request:", error)
      if (error.response.data.errors[0].message.includes("already exists")) {
        return NextResponse.json(
          {
            error: `Pull request already exists for issue. Please remove any existing pull requests from ${NEW_BRANCH_NAME} to continue.`,
          },
          { status: 400 }
        )
      }
      // TODO: Handle errors if PR creation fails because of API limits, such as rate limits, plan limits, etc.
      console.error("Error creating PR:", error)
    }

    console.debug("[DEBUG] Operation completed successfully")
    return NextResponse.json(
      { message: "Issue resolved successfully.", pr: pr },
      { status: 200 }
    )
  } catch (error) {
    console.error("[ERROR] Fatal error in POST handler:", error)
    return NextResponse.json(
      { error: "Failed to resolve issue." },
      { status: 500 }
    )
  }
}
